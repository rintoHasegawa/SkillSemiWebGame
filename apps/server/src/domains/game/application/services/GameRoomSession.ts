/**
 * GameRoomSession
 * 1ルーム分のゲーム進行状態とゲームループ実行を管理する
 */
import { logEvent } from "@server/logging/logger";
import {
  gameDomainLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import type { gameTypes, GameResultPayload } from "@repo/shared";
import { GameLoop } from "../../loop/GameLoop";
import { Player } from "../../entities/player/Player.js";
import { MapStore } from "../../entities/map/MapStore";
import { BombStateStore } from "../../entities/bomb/BombStateStore";
import { createSpawnedPlayer } from "../../entities/player/playerSpawn.js";
import {
  isValidPosition,
  setPlayerPosition,
} from "../../entities/player/playerMovement.js";
import { buildGameResultPayload } from "./gameResultCalculator.js";
import { TeamAssignmentService } from "../services/TeamAssignmentService.js";

/** ルーム単位のゲーム状態とループ進行を保持するセッションクラス */
export class GameRoomSession {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private bombStateStore: BombStateStore;
  private gameLoop: GameLoop | null = null;
  private startTime: number | undefined;

  constructor(
    private roomId: string,
    playerIds: string[],
  ) {
    this.players = new Map();
    this.mapStore = new MapStore();
    this.bombStateStore = new BombStateStore();

    playerIds.forEach((playerId) => {
      // 現在のプレイヤー構成から人数が最も少ないチームを算出する
      const assignedTeamId = TeamAssignmentService.getBalancedTeamId(
        this.players,
      );

      // 算出したチームIDを指定してプレイヤーを生成する
      const player = createSpawnedPlayer(playerId, assignedTeamId);

      this.players.set(playerId, player);
    });
  }

  public start(
    tickRate: number,
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void,
  ): void {
    if (this.gameLoop) {
      return;
    }

    this.startTime = Date.now();
    this.gameLoop = new GameLoop(
      this.roomId,
      tickRate,
      this.players,
      this.mapStore,
      onTick,
      () => {
        const resultPayload = buildGameResultPayload(this.mapStore.getGridColorsSnapshot());
        this.dispose();
        onGameEnd(resultPayload);
      },
    );

    this.gameLoop.start();
  }

  public movePlayer(id: string, x: number, y: number): void {
    const player = this.players.get(id);
    if (!player) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_PLAYER_NOT_FOUND,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    if (!isValidPosition(x, y)) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    setPlayerPosition(player, x, y);
  }

  public removePlayer(id: string): boolean {
    return this.players.delete(id);
  }

  public getStartTime(): number | undefined {
    return this.startTime;
  }

  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  public shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    return this.bombStateStore.shouldBroadcastBombPlaced(dedupeKey, nowMs);
  }

  public issueServerBombId(): string {
    return this.bombStateStore.issueServerBombId(this.roomId);
  }

  public dispose(): void {
    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }
    this.players.clear();
  }
}
