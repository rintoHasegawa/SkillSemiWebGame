/**
 * orchestratorEventLogger
 * オーケストレータ層で利用するイベントログ記録を共通化する
 */
import { contracts as protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes } from "@server/logging/index";

/** オーケストレータで未解決時に記録するイベント型 */
type MissingRoomNetworkEvent =
  | typeof protocol.SocketEvents.MOVE
  | typeof protocol.SocketEvents.PLACE_BOMB
  | typeof protocol.SocketEvents.BOMB_HIT_REPORT;

/** 未解決のルーム関連イベントをNetworkスコープで記録する */
export const logIgnoredMissingRoom = (
  event: MissingRoomNetworkEvent,
  socketId: string,
): void => {
  logEvent(logScopes.NETWORK, {
    event,
    result: logResults.IGNORED_MISSING_ROOM,
    socketId,
  });
};
