/**
 * registerPlaceBombInputHandler
 * PLACE_BOMB入力イベントの購読とユースケース連携を登録する
 */
import { protocol, type PlaceBombPayload } from "@repo/shared";
import type {
  BombPlacementPort,
  BombOutputPort,
  MovePlayerPort,
  ReadyForGamePort,
  StartGamePort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  FindRoomByOwnerPort,
  FindRoomByPlayerPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { placeBombUseCase } from "@server/domains/game/application/useCases/placeBombUseCase";

type RegisterPlaceBombInputHandlerParams = {
  socketId: string;
  gameManager: StartGamePort & ReadyForGamePort & MovePlayerPort & BombPlacementPort;
  roomManager: FindRoomByOwnerPort & FindRoomByPlayerPort & RoomPhaseTransitionPort;
  output: BombOutputPort;
  onEvent: (event: typeof protocol.SocketEvents.PLACE_BOMB, listener: (payload: unknown) => void) => void;
  guardPlaceBombPayload: (payload: unknown) => payload is PlaceBombPayload;
};

/** PLACE_BOMB入力を検証し，所属ルームへ同期配信する */
export const registerPlaceBombInputHandler = ({
  socketId,
  gameManager,
  roomManager,
  output,
  onEvent,
  guardPlaceBombPayload,
}: RegisterPlaceBombInputHandlerParams): void => {
  onEvent(protocol.SocketEvents.PLACE_BOMB, (data) => {
    if (!guardPlaceBombPayload(data)) {
      return;
    }

    placeBombUseCase({
      roomResolver: roomManager,
      bombStore: gameManager,
      input: {
        socketId,
        payload: data,
        nowMs: Date.now(),
      },
      output,
    });
  });
};
