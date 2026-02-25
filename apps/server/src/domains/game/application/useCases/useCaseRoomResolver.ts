/**
 * useCaseRoomResolver
 * ゲーム系ユースケースで利用するルーム解決処理を提供する
 */
import type { FindRoomByPlayerPort } from "@server/domains/room/application/ports/roomUseCasePorts";

/** ソケットIDから所属ルームIDを解決して返す */
export const resolveRoomIdBySocketId = (
  roomResolver: FindRoomByPlayerPort,
  socketId: string
): string | undefined => {
  return roomResolver.getRoomByPlayerId(socketId)?.roomId;
};
