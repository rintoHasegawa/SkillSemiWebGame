/**
 * disconnectCoordinator
 * DISCONNECTイベントの調停を行い，ゲーム離脱処理とルーム離脱処理を順序実行する
 */
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { handleGameDisconnect } from "@server/network/handlers/GameHandler";
import { handleRoomDisconnect } from "@server/network/handlers/RoomHandler";

type DisconnectCoordinatorParams = {
  io: Parameters<typeof handleGameDisconnect>[0];
  socketId: string;
  gameManager: GameManager;
  roomManager: RoomManager;
};

/** 切断時にゲーム処理とルーム処理を調停し，一貫した離脱処理を実行する */
export const disconnectCoordinator = ({
  io,
  socketId,
  gameManager,
  roomManager,
}: DisconnectCoordinatorParams) => {
  const roomId = roomManager.getRoomByPlayerId(socketId)?.roomId;

  handleGameDisconnect(io, gameManager, roomId, socketId);
  handleRoomDisconnect(io, socketId, roomManager);
};
