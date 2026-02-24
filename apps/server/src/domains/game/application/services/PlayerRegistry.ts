import { config } from "@repo/shared";
import { Player } from "../../entities/Player.js";
import { logEvent } from "@server/logging/logEvent";

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
    logEvent("PlayerRegistry", {
      event: "PLAYER_ADD",
      result: "added",
      socketId: id,
      totalPlayers: this.players.size,
    });
    return player;
  }

  public removePlayer(id: string) {
    const existed = this.players.delete(id);
    if (existed) {
      logEvent("PlayerRegistry", {
        event: "PLAYER_REMOVE",
        result: "removed",
        socketId: id,
        totalPlayers: this.players.size,
      });
    } else {
      logEvent("PlayerRegistry", {
        event: "PLAYER_REMOVE",
        result: "ignored_not_found",
        socketId: id,
      });
    }
  }

  public getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  public movePlayer(id: string, x: number, y: number) {
    const player = this.players.get(id);
    if (player) {
      logEvent("PlayerRegistry", {
        event: "MOVE",
        result: "received",
        socketId: id,
        x: Math.round(x),
        y: Math.round(y),
      });
      if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) {
        logEvent("PlayerRegistry", {
          event: "MOVE",
          result: "ignored_invalid_payload",
          socketId: id,
        });
        return;
      }
      player.x = x;
      player.y = y;
    } else {
      logEvent("PlayerRegistry", {
        event: "MOVE",
        result: "ignored_player_not_found",
        socketId: id,
      });
    }
  }

  public getPlayersRef(): Map<string, Player> {
    return this.players;
  }
}
