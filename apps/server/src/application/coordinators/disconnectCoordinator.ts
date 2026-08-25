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

/** 切断調停の実行結果 */
export type DisconnectCoordinatorResult = {
  /** Bot引き継ぎで在席を維持したか（復帰予約の可否判定に使う） */
  replacedWithBot: boolean;
};

/**
 * 切断時にゲーム処理とルーム処理を調停し，一貫した離脱処理を実行する
 * @returns Bot引き継ぎの有無を含む調停結果
 */
export const disconnectCoordinator = ({
  socketId,
  roomManager,
  runtimeRegistry,
  gameOutput,
  roomOutput,
}: DisconnectCoordinatorParams): DisconnectCoordinatorResult => {
  // ゲームランタイムとルームIDを個別に解決し，ルーム解決の失敗で
  // ゲーム側の離脱処理ごと落とさない（他クライアントのゴースト残留を防ぐ）
  const gameManager = runtimeRegistry.getGameManagerByPlayerId(socketId);
  const roomId = roomManager.getRoomByPlayerId(socketId)?.roomId;

  const replacedWithBot = gameManager
    ? disconnectUseCase({
        gameManager,
        roomId,
        playerId: socketId,
        output: gameOutput,
      })
    : false;

  roomDisconnectUseCase({
    roomManager,
    runtimeRegistry,
    socketId,
    output: roomOutput,
  });

  return { replacedWithBot };
};
