/**
 * GamePlayerOperationService
 * ゲームセッション内のプレイヤー移動と離脱操作を管理する
 */
import { logEvent } from "@server/logging/logger";
import { gameDomainLogEvents, logResults, logScopes } from "@server/logging/index";
import { GameRoomSession } from "./GameRoomSession";

type SessionStore = Map<string, GameRoomSession>;
type PlayerRoomIndex = Map<string, string>;
type RoomPlayersIndex = Map<string, Set<string>>;

/** プレイヤー移動とセッション離脱処理を提供するサービス */
export class GamePlayerOperationService {
  constructor(
    private sessions: SessionStore,
    private playerToRoom: PlayerRoomIndex,
    private roomToPlayers: RoomPlayersIndex
  ) {}

  public movePlayer(id: string, x: number, y: number): void {
    const roomId = this.playerToRoom.get(id);
    if (!roomId) {
      logEvent(logScopes.GAME_PLAYER_OPERATION_SERVICE, {
        event: gameDomainLogEvents.PLAYER_MOVE,
        result: logResults.IGNORED_PLAYER_NOT_IN_SESSION,
        socketId: id,
      });
      return;
    }

    this.sessions.get(roomId)?.movePlayer(id, x, y);
  }

  public removePlayer(id: string): void {
    const roomId = this.playerToRoom.get(id);
    if (!roomId) {
      logEvent(logScopes.GAME_PLAYER_OPERATION_SERVICE, {
        event: gameDomainLogEvents.PLAYER_REMOVE,
        result: logResults.IGNORED_PLAYER_NOT_IN_SESSION,
        socketId: id,
      });
      return;
    }

    const roomPlayerSet = this.roomToPlayers.get(roomId);
    const session = this.sessions.get(roomId);
    if (!session) {
      this.removePlayerFromIndexes(roomId, id, roomPlayerSet);
      return;
    }

    const removed = session.removePlayer(id);
    this.removePlayerFromIndexes(roomId, id, roomPlayerSet);

    if (removed && session.getPlayers().length === 0) {
      session.dispose();
      this.sessions.delete(roomId);
      this.roomToPlayers.delete(roomId);
      logEvent(logScopes.GAME_PLAYER_OPERATION_SERVICE, {
        event: gameDomainLogEvents.PLAYER_REMOVE,
        result: logResults.SESSION_DISPOSED_EMPTY_ROOM,
        roomId,
        socketId: id,
      });
    }
  }

  private removePlayerFromIndexes(
    roomId: string,
    playerId: string,
    roomPlayerSet: Set<string> | undefined
  ): void {
    this.playerToRoom.delete(playerId);

    if (!roomPlayerSet) {
      return;
    }

    roomPlayerSet.delete(playerId);
    if (roomPlayerSet.size === 0) {
      this.roomToPlayers.delete(roomId);
    }
  }
}