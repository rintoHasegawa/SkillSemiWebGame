/**
 * readyForGameCoordinator
 * READY_FOR_GAMEイベントの調停を行い，所属ルーム解決と準備状態通知を橋渡しする
 */
import {
  type GameOutputPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type { ReadyForGameCoordinatorDeps } from "./coordinatorDeps";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";
import { resolveCoordinatorRuntime } from "./runtimeCoordinatorSupport";

type ReadyForGameCoordinatorParams = {
  socketId: string;
} & ReadyForGameCoordinatorDeps & {
  output: Pick<GameOutputPort, "publishCurrentPlayersToSocket" | "publishGameStartToSocket">;
};

/** READY_FOR_GAME受信時に所属ルームを解決し，準備状態ユースケースを実行する */
export const readyForGameCoordinator = ({
  socketId,
  roomManager,
  runtimeRegistry,
  output,
}: ReadyForGameCoordinatorParams) => {
  const runtime = resolveCoordinatorRuntime(
    {
      roomManager,
      runtimeRegistry,
    },
    socketId,
  );

  readyForGameUseCase({
    socketId,
    roomId: runtime?.roomId,
    gameManager: runtime?.gameManager,
    output,
  });
};
