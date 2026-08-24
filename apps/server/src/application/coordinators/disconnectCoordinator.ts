/**
 * disconnectCoordinator
 * DISCONNECTイベントの調停を行い，ゲーム離脱処理とルーム離脱処理を順序実行する
 */
import type { GameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { RoomOutputPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import type { DisconnectCoordinatorDeps } from "./coordinatorDeps";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";

/** 切断調停で利用する入力ポートと出力ポートの契約 */
type DisconnectCoordinatorParams = {
  socketId: string;
} & DisconnectCoordinatorDeps & {
  gameOutput: Pick<GameOutputPort, "publishPlayerRemovedToRoom">;
  roomOutput: Pick<
    RoomOutputPort,
    "publishRoomUpdateToRoom" | "closeRoomChannel"
  >;
};

/** 切断時にゲーム処理とルーム処理を調停し，一貫した離脱処理を実行する */
export const disconnectCoordinator = ({
  socketId,
  roomManager,
  runtimeRegistry,
  gameOutput,
  roomOutput,
}: DisconnectCoordinatorParams) => {
  // ゲームランタイムとルームIDを個別に解決し，ルーム解決の失敗で
  // ゲーム側の離脱処理ごと落とさない（他クライアントのゴースト残留を防ぐ）
  const gameManager = runtimeRegistry.getGameManagerByPlayerId(socketId);
  const roomId = roomManager.getRoomByPlayerId(socketId)?.roomId;

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
