/**
 * registerMoveInputHandler
 * MOVE入力イベントの購読とユースケース連携を登録する
 */
import { protocol, type playerTypes } from "@repo/shared";
import type {
  BombPlacementPort,
  MovePlayerPort,
  ReadyForGamePort,
  StartGamePort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";

type RegisterMoveInputHandlerParams = {
  socketId: string;
  gameManager: StartGamePort & ReadyForGamePort & MovePlayerPort & BombPlacementPort;
  onEvent: (event: typeof protocol.SocketEvents.MOVE, listener: (payload: unknown) => void) => void;
  guardMovePayload: (payload: unknown) => payload is playerTypes.MovePayload;
};

/** MOVE入力を検証しプレイヤー移動ユースケースへ連携する */
export const registerMoveInputHandler = ({
  socketId,
  gameManager,
  onEvent,
  guardMovePayload,
}: RegisterMoveInputHandlerParams): void => {
  onEvent(protocol.SocketEvents.MOVE, (data) => {
    if (!guardMovePayload(data)) {
      return;
    }

    movePlayerUseCase({
      gameManager,
      playerId: socketId,
      move: data,
    });
  });
};
