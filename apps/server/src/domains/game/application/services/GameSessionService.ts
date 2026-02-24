import { config } from "@repo/shared";
import { type TickData } from "../../loop/GameLoop";
import { logEvent } from "@server/logging/logEvent";
import { GameRoomSession } from "./GameRoomSession";

export class GameSessionService {
  private sessions: Map<string, GameRoomSession>;
  private playerToRoom: Map<string, string>;

  constructor() {
    this.sessions = new Map();
    this.playerToRoom = new Map();
  }

  public getRoomStartTime(roomId: string): number | undefined {
    return this.sessions.get(roomId)?.getStartTime();
  }

  public getRoomPlayers(roomId: string) {
    return this.sessions.get(roomId)?.getPlayers() ?? [];
  }

  public startRoomSession(
    roomId: string,
    playerIds: string[],
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ) {
    if (this.sessions.has(roomId)) {
      logEvent("GameSessionService", {
        event: "START_GAME_LOOP",
        result: "ignored_already_running",
        roomId,
      });
      return;
    }

    const tickRate = config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;
    const session = new GameRoomSession(roomId, playerIds);

    playerIds.forEach((playerId) => {
      this.playerToRoom.set(playerId, roomId);
    });

    this.sessions.set(roomId, session);
    session.start(tickRate, onTick, () => {
      this.clearRoomPlayerIndex(roomId);
      this.sessions.delete(roomId);
      onGameEnd();
    });

    logEvent("GameSessionService", {
      event: "START_GAME_LOOP",
      result: "started",
      roomId,
      playerCount: playerIds.length,
    });
  }

  public movePlayer(id: string, x: number, y: number): void {
    const roomId = this.playerToRoom.get(id);
    if (!roomId) {
      logEvent("GameSessionService", {
        event: "MOVE",
        result: "ignored_player_not_in_session",
        socketId: id,
      });
      return;
    }

    this.sessions.get(roomId)?.movePlayer(id, x, y);
  }

  public removePlayer(id: string): void {
    const roomId = this.playerToRoom.get(id);
    if (!roomId) {
      logEvent("GameSessionService", {
        event: "REMOVE_PLAYER",
        result: "ignored_player_not_in_session",
        socketId: id,
      });
      return;
    }

    const session = this.sessions.get(roomId);
    if (!session) {
      this.playerToRoom.delete(id);
      return;
    }

    const removed = session.removePlayer(id);
    this.playerToRoom.delete(id);

    if (removed && session.isEmpty()) {
      session.dispose();
      this.sessions.delete(roomId);
      logEvent("GameSessionService", {
        event: "REMOVE_PLAYER",
        result: "session_disposed_empty_room",
        roomId,
        socketId: id,
      });
    }
  }

  private clearRoomPlayerIndex(roomId: string): void {
    Array.from(this.playerToRoom.entries()).forEach(([playerId, mappedRoomId]) => {
      if (mappedRoomId === roomId) {
        this.playerToRoom.delete(playerId);
      }
    });
  }
}
