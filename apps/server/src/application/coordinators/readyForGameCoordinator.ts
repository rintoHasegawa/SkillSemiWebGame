/**
 * readyForGameCoordinator
 * READY_FOR_GAMEイベントの調停を行い，所属ルーム解決と準備状態通知を橋渡しする
 */
import {
  type GameOutputPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type { ReadyForGameDeps } from "@server/domains/room/application/ports/roomUseCasePorts";
import { resolveRuntimeByPlayerId } from "@server/domains/room/application/services/RoomRuntimeResolver";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";

type ReadyForGameCoordinatorParams = {
  socketId: string;
} & ReadyForGameDeps & {
  output: Pick<GameOutputPort, "publishCurrentPlayersToSocket" | "publishGameStartToSocket">;
};

/** READY_FOR_GAME受信時に所属ルームを解決し，準備状態ユースケースを実行する */
export const readyForGameCoordinator = ({
  socketId,
  roomManager,
  runtimeRegistry,
  output,
}: ReadyForGameCoordinatorParams) => {
  const runtime = resolveRuntimeByPlayerId(roomManager, runtimeRegistry, socketId);

  readyForGameUseCase({
    socketId,
    roomId: runtime?.roomId,
    gameManager: runtime?.gameManager,
    output,
  });
};
