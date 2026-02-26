/**
 * RoomRuntimeResolver
 * プレイヤーIDからルームIDとゲームランタイムを解決する
 */
import type {
  FindGameByPlayerPort,
  FindRoomByPlayerPort,
  RoomScopedGamePort,
} from "../ports/roomUseCasePorts";

/** プレイヤー起点で解決したランタイム情報 */
export type RuntimeByPlayerResolution = {
  roomId: string;
  gameManager: RoomScopedGamePort;
};

/** プレイヤーIDからルームIDとゲームランタイムを解決する */
export const resolveRuntimeByPlayerId = (
  roomResolver: FindRoomByPlayerPort,
  runtimeResolver: FindGameByPlayerPort,
  playerId: string
): RuntimeByPlayerResolution | undefined => {
  const roomId = roomResolver.getRoomByPlayerId(playerId)?.roomId;
  const gameManager = runtimeResolver.getGameManagerByPlayerId(playerId);
  if (!roomId || !gameManager) {
    return undefined;
  }

  return {
    roomId,
    gameManager,
  };
};
