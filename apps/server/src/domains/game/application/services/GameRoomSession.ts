import { config } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";
import { GameLoop, type TickData } from "../../GameLoop";
import { Player } from "../../entities/Player.js";
import { MapStore } from "../../states/MapStore";

export class GameRoomSession {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private gameLoop: GameLoop | null = null;
  private startTime: number | undefined;

  constructor(private roomId: string, playerIds: string[]) {
    this.players = new Map();
    this.mapStore = new MapStore();

    playerIds.forEach((playerId) => {
      const player = new Player(playerId);
      player.x = config.GAME_CONFIG.GRID_COLS / 2;
      player.y = config.GAME_CONFIG.GRID_ROWS / 2;
      this.players.set(playerId, player);
    });
  }

  public start(
    tickRate: number,
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ): void {
    if (this.gameLoop) {
      return;
    }

    this.startTime = Date.now();
    this.gameLoop = new GameLoop(
      this.roomId,
      tickRate,
      this.getPlayerIds(),
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

    if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) {
      logEvent("GameRoomSession", {
        event: "MOVE",
        result: "ignored_invalid_payload",
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    player.x = x;
    player.y = y;
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