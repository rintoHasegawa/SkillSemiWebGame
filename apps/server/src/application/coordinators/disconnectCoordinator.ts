/**
 * disconnectCoordinator
 * DISCONNECTイベントの調停を行い，ゲーム離脱処理とルーム離脱処理を順序実行する
 */
import {
  type BombRoomStateCleanupPort,
  type DisconnectPlayerPort,
  type GameOutputPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  DisconnectRoomPort,
  FindRoomByIdPort,
  FindRoomByPlayerPort,
  RoomOutputPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";

/** 切断調停で利用する入力ポートと出力ポートの契約 */
export type DisconnectCoordinatorParams = {
  socketId: string;
  gameManager: DisconnectPlayerPort & BombRoomStateCleanupPort;
  roomManager: DisconnectRoomPort & FindRoomByPlayerPort & FindRoomByIdPort;
  gameOutput: Pick<GameOutputPort, "publishPlayerRemovedToRoom">;
  roomOutput: Pick<RoomOutputPort, "publishRoomUpdateToRoom">;
};

/** 切断時にゲーム処理とルーム処理を調停し，一貫した離脱処理を実行する */
export const disconnectCoordinator = ({
  socketId,
  gameManager,
  roomManager,
  gameOutput,
  roomOutput,
}: DisconnectCoordinatorParams) => {
  const roomId = roomManager.getRoomByPlayerId(socketId)?.roomId;

  disconnectUseCase({
    gameManager,
    roomId,
    playerId: socketId,
    output: gameOutput,
  });

  roomDisconnectUseCase({
    roomManager,
    socketId,
    output: roomOutput,
  });

  if (roomId && !roomManager.getRoomById(roomId)) {
    gameManager.clearBombRoomState(roomId, "room-deleted");
  }
};
