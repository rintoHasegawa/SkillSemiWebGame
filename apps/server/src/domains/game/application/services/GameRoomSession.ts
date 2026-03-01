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
import type { domain, GameResultPayload, PlaceBombPayload } from "@repo/shared";
import type { ActiveBombRegistration } from "../ports/gameUseCasePorts";
import { config } from "@server/config";
import { GameLoop, type GameLoopCallbacks } from "../../loop/GameLoop";
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

/** GameRoomSession のコールバック集合 */
export type GameSessionCallbacks = {
  onTick: (data: domain.game.tick.TickData) => void;
  onGameEnd: (payload: GameResultPayload) => void;
  onBotPlaceBomb?: (ownerId: string, payload: PlaceBombPayload) => void;
  onBotBombHit?: (targetPlayerId: string, bombId: string) => void;
};

/** ルーム単位のゲーム状態とループ進行を保持するセッションクラス */
export class GameRoomSession {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private bombStateStore: BombStateStore;
  private gameLoop: GameLoop | null = null;
  private startTime: number | undefined;
  private startDelayTimer: NodeJS.Timeout | null = null;

  constructor(
    private roomId: string,
    playerIds: string[],
    playerNamesById: Record<string, string>,
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
      const playerName = playerNamesById[playerId] ?? playerId;
      const player = createSpawnedPlayer(playerId, playerName, assignedTeamId);

      this.players.set(playerId, player);
    });
  }

  public start(
    tickRate: number,
    callbacks: GameSessionCallbacks,
  ): void {
    if (this.gameLoop) {
      return;
    }

    const gameStartDelayMs = (
      config.GAME_CONFIG as typeof config.GAME_CONFIG & {
        GAME_START_DELAY_MS?: number;
      }
    ).GAME_START_DELAY_MS;
    const startDelayMs = Math.max(0, gameStartDelayMs ?? 0);
    this.startTime = Date.now() + startDelayMs;

    const loopCallbacks: GameLoopCallbacks = {
      onTick: callbacks.onTick,
      onGameEnd: () => {
        const resultPayload = buildGameResultPayload(
          this.mapStore.getGridColorsSnapshot(),
        );
        this.dispose();
        callbacks.onGameEnd(resultPayload);
      },
      onBotPlaceBomb: callbacks.onBotPlaceBomb,
      onBotBombHit: callbacks.onBotBombHit,
    };

    this.gameLoop = new GameLoop({
      roomId: this.roomId,
      tickRate,
      players: this.players,
      mapStore: this.mapStore,
      activeBombRegistry: this.bombStateStore.activeBombRegistry,
      callbacks: loopCallbacks,
    });

    if (startDelayMs === 0) {
      this.gameLoop.start();
      return;
    }

    this.startDelayTimer = setTimeout(() => {
      this.startDelayTimer = null;
      this.gameLoop?.start();
    }, startDelayMs);
  }

  public movePlayer(id: string, x: number, y: number): void {
    if (this.startTime && Date.now() < this.startTime) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

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
    this.gameLoop?.releaseBotControl(id);
    return this.players.delete(id);
  }

  /** 指定プレイヤーを切断後もBot制御で継続させる */
  public promotePlayerToBotControl(id: string): boolean {
    if (!this.players.has(id) || !this.gameLoop) {
      return false;
    }

    this.gameLoop.promotePlayerToBotControl(id);
    return true;
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

  public shouldBroadcastBombHitReport(
    dedupeKey: string,
    nowMs: number,
  ): boolean {
    return this.bombStateStore.shouldBroadcastBombHitReport(dedupeKey, nowMs);
  }

  public issueServerBombId(): string {
    return this.bombStateStore.issueServerBombId();
  }

  /** 設置済み爆弾をアクティブレジストリに登録する */
  public registerActiveBomb(registration: ActiveBombRegistration): void {
    const player = this.players.get(registration.ownerPlayerId);
    const ownerTeamId = player?.teamId ?? -1;
    this.bombStateStore.activeBombRegistry.registerBomb({
      bombId: registration.bombId,
      x: registration.x,
      y: registration.y,
      explodeAtElapsedMs: registration.explodeAtElapsedMs,
      ownerTeamId,
    });
  }

  public dispose(): void {
    if (this.startDelayTimer) {
      clearTimeout(this.startDelayTimer);
      this.startDelayTimer = null;
    }

    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }
    this.players.clear();
  }
}
