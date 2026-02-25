/**
 * GameRoomSession
 * 1ルーム分のゲーム進行状態とゲームループ実行を管理する
 */
import { logEvent } from "@server/logging/logEvent";
import type { gameTypes } from "@repo/shared";
import { GameLoop } from "../../loop/GameLoop";
import { Player } from "../../entities/player/Player.js";
import { MapStore } from "../../entities/map/MapStore";
import { createSpawnedPlayer } from "../../entities/player/playerSpawn.js";
import {
  isValidPosition,
  setPlayerPosition,
} from "../../entities/player/playerMovement.js";

/** ルーム単位のゲーム状態とループ進行を保持するセッションクラス */
export class GameRoomSession {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private gameLoop: GameLoop | null = null;
  private startTime: number | undefined;

  constructor(private roomId: string, playerIds: string[]) {
    this.players = new Map();
    this.mapStore = new MapStore();

    playerIds.forEach((playerId) => {
      const player = createSpawnedPlayer(playerId);
      this.players.set(playerId, player);
    });
  }

  public start(
    tickRate: number,
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: () => void
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
        this.dispose();
        onGameEnd();
      }
    );

    this.gameLoop.start();
  }

  public movePlayer(id: string, x: number, y: number): void {
    const player = this.players.get(id);
    if (!player) {
      logEvent("GameRoomSession", {
        event: "MOVE",
        result: "ignored_player_not_found",
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    if (!isValidPosition(x, y)) {
      logEvent("GameRoomSession", {
        event: "MOVE",
        result: "ignored_invalid_payload",
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

  public getPlayerIds(): string[] {
    return Array.from(this.players.keys());
  }

  public isEmpty(): boolean {
    return this.players.size === 0;
  }

  public dispose(): void {
    this.gameLoop?.stop();
    this.gameLoop = null;
    this.startTime = undefined;
  }
}