import { config, gridMapLogic } from "@repo/shared";
import type { gridMapTypes } from "@repo/shared";
import { GameLoop, type TickData } from "../../GameLoop";
import { Player } from "../../entities/Player.js";
import { MapStore } from "../../states/MapStore";

export class GameSessionService {
  private mapStore: MapStore;
  private gameLoops: Map<string, GameLoop>;
  private roomStartTimes: Map<string, number>;

  constructor(private players: Map<string, Player>) {
    this.mapStore = new MapStore();
    this.gameLoops = new Map();
    this.roomStartTimes = new Map();
  }

  public getRoomStartTime(roomId: string): number | undefined {
    return this.roomStartTimes.get(roomId);
  }

  public startGameLoop(
    roomId: string,
    playerIds: string[],
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ) {
    if (this.gameLoops.has(roomId)) {
      console.log("[GameManager] startGameLoop ignored (already running)", { roomId });
      return;
    }

    const tickRate = config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;
    this.roomStartTimes.set(roomId, Date.now());

    const loop = new GameLoop(
      roomId,
      tickRate,
      playerIds,
      this.players,
      this.mapStore,
      onTick,
      () => {
        this.roomStartTimes.delete(roomId);
        this.gameLoops.delete(roomId);
        onGameEnd();
      }
    );

    loop.start();
    this.gameLoops.set(roomId, loop);
    console.log("[GameManager] game loop started", { roomId, playerCount: playerIds.length });
  }

  public stopGameLoop(roomId: string) {
    const loop = this.gameLoops.get(roomId);
    if (loop) {
      loop.stop();
      this.gameLoops.delete(roomId);
      this.roomStartTimes.delete(roomId);
      console.log("[GameManager] game loop stopped", { roomId });
    } else {
      console.log("[GameManager] stopGameLoop ignored (not running)", { roomId });
    }
  }

  public paintAndGetUpdates(playerId: string): gridMapTypes.CellUpdate[] {
    const player = this.players.get(playerId);
    if (!player) return [];

    const gridIndex = gridMapLogic.getGridIndexFromPosition(player.x, player.y);
    if (gridIndex !== null) {
      this.mapStore.paintCell(gridIndex, player.teamId);
    }

    return this.mapStore.getAndClearUpdates();
  }
}
