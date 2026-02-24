import { config } from "@repo/shared";
import { Player } from "../../entities/Player.js";

export class PlayerRegistry {
  private players: Map<string, Player>;

  constructor() {
    this.players = new Map();
  }

  public addPlayer(id: string): Player {
    const player = new Player(id);
    player.x = config.GAME_CONFIG.GRID_COLS / 2;
    player.y = config.GAME_CONFIG.GRID_ROWS / 2;
    this.players.set(id, player);
    console.log("[GameManager] player added", { playerId: id, totalPlayers: this.players.size });
    return player;
  }

  public removePlayer(id: string) {
    const existed = this.players.delete(id);
    if (existed) {
      console.log("[GameManager] player removed", { playerId: id, totalPlayers: this.players.size });
    } else {
      console.log("[GameManager] player remove ignored (not found)", { playerId: id });
    }
  }

  public getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  public movePlayer(id: string, x: number, y: number) {
    const player = this.players.get(id);
    if (player) {
      console.log(`Move Request -> ID:${id.slice(0, 4)} x:${Math.round(x)} y:${Math.round(y)}`);
      if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) {
        console.log("⚠️ 無効なデータなので無視しました");
        return;
      }
      player.x = x;
      player.y = y;
    } else {
      console.log("[GameManager] move ignored (player not found)", { playerId: id });
    }
  }

  public getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public getPlayersRef(): Map<string, Player> {
    return this.players;
  }
}
