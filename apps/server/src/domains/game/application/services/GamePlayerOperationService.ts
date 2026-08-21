/**
 * GamePlayerOperationService
 * ゲームセッション内のプレイヤー移動と離脱操作を管理する
 */
import { logEvent } from "@server/logging/logger";
import { gameDomainLogEvents, logResults, logScopes } from "@server/logging/index";
import { GameRoomSession } from "./GameRoomSession";

type GameSessionRef = { current: GameRoomSession | null };
type ActivePlayerIndex = Set<string>;

/** プレイヤー移動とセッション離脱処理を提供するサービス */
export class GamePlayerOperationService {
  constructor(
    private sessionRef: GameSessionRef,
    private activePlayerIds: ActivePlayerIndex
  ) {}

  public movePlayer(id: string, x: number, y: number): void {
    const session = this.sessionRef.current;
    if (!session || !this.activePlayerIds.has(id)) {
      logEvent(logScopes.GAME_PLAYER_OPERATION_SERVICE, {
        event: gameDomainLogEvents.PLAYER_MOVE,
        result: logResults.IGNORED_PLAYER_NOT_IN_SESSION,
        socketId: id,
      });
      return;
    }

    session.movePlayer(id, x, y);
  }

  public removePlayer(id: string): void {
    const session = this.sessionRef.current;
    if (!session || !this.activePlayerIds.has(id)) {
      logEvent(logScopes.GAME_PLAYER_OPERATION_SERVICE, {
        event: gameDomainLogEvents.PLAYER_REMOVE,
        result: logResults.IGNORED_PLAYER_NOT_IN_SESSION,
        socketId: id,
      });
      return;
    }

    session.removePlayer(id);
    this.activePlayerIds.delete(id);

    // セッション側の削除可否ではなく残存プレイヤー数で生存を判断する
    // （既に不在で削除がfalseでも，0人ならループを止めて破棄する）
    if (session.getPlayers().length > 0) {
      return;
    }

    session.dispose();
    this.sessionRef.current = null;
    this.activePlayerIds.clear();
    logEvent(logScopes.GAME_PLAYER_OPERATION_SERVICE, {
      event: gameDomainLogEvents.PLAYER_REMOVE,
      result: logResults.SESSION_DISPOSED_EMPTY_ROOM,
      socketId: id,
    });
  }

  public replaceDisconnectedPlayerWithBot(id: string): boolean {
    const session = this.sessionRef.current;
    if (!session || !this.activePlayerIds.has(id)) {
      logEvent(logScopes.GAME_PLAYER_OPERATION_SERVICE, {
        event: gameDomainLogEvents.PLAYER_REMOVE,
        result: logResults.IGNORED_PLAYER_NOT_IN_SESSION,
        socketId: id,
      });
      return false;
    }

    return session.promotePlayerToBotControl(id);
  }
}