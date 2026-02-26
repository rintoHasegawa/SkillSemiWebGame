/**
 * disconnectCoordinator
 * DISCONNECTイベントの調停を行い，ゲーム離脱処理とルーム離脱処理を順序実行する
 */
import {
  type GameOutputPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  CleanupGameRuntimePort,
  DisconnectRoomPort,
  FindGameByPlayerPort,
  FindRoomByIdPort,
  FindRoomByPlayerPort,
  RoomOutputPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";

type DisconnectDeps = {
  roomManager: DisconnectRoomPort & FindRoomByPlayerPort & FindRoomByIdPort;
  runtimeRegistry: FindGameByPlayerPort & CleanupGameRuntimePort;
};

/** 切断調停で利用する入力ポートと出力ポートの契約 */
export type DisconnectCoordinatorParams = {
  socketId: string;
} & DisconnectDeps & {
  gameOutput: Pick<GameOutputPort, "publishPlayerRemovedToRoom">;
  roomOutput: Pick<RoomOutputPort, "publishRoomUpdateToRoom">;
};

/** 切断時にゲーム処理とルーム処理を調停し，一貫した離脱処理を実行する */
export const disconnectCoordinator = ({
  socketId,
  roomManager,
  runtimeRegistry,
  gameOutput,
  roomOutput,
}: DisconnectCoordinatorParams) => {
  const roomId = roomManager.getRoomByPlayerId(socketId)?.roomId;
  const gameManager = runtimeRegistry.getGameManagerByPlayerId(socketId);

  if (gameManager) {
    disconnectUseCase({
      gameManager,
      roomId,
      playerId: socketId,
      output: gameOutput,
    });
  }

  roomDisconnectUseCase({
    roomManager,
    runtimeRegistry,
    socketId,
    output: roomOutput,
  });
};
