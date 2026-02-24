import { logEvent } from "@server/logging/logEvent";
import { GameRoomSession } from "./GameRoomSession";

type SessionStore = Map<string, GameRoomSession>;
type PlayerRoomIndex = Map<string, string>;

export class GamePlayerOperationService {
  constructor(
    private sessions: SessionStore,
    private playerToRoom: PlayerRoomIndex
  ) {}

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
}