/**
 * readyForGameCoordinator
 * READY_FOR_GAMEイベントの調停を行い，所属ルーム解決と準備状態通知を橋渡しする
 */
import {
  type GameOutputPort,
  type GameRoomLookupPort,
  type ReadyForGamePort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";

type ReadyForGameCoordinatorParams = {
  socketId: string;
  gameManager: ReadyForGamePort;
  roomManager: GameRoomLookupPort;
  output: Pick<GameOutputPort, "publishCurrentPlayersToSocket" | "publishGameStartToSocket">;
};

/** READY_FOR_GAME受信時に所属ルームを解決し，準備状態ユースケースを実行する */
export const readyForGameCoordinator = ({
  socketId,
  gameManager,
  roomManager,
  output,
}: ReadyForGameCoordinatorParams) => {
  const room = roomManager.getRoomByPlayerId(socketId);

  readyForGameUseCase({
    socketId,
    roomId: room?.roomId,
    gameManager,
    output,
  });
};
