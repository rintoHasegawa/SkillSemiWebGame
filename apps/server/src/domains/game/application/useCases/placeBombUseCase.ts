/**
 * placeBombUseCase
 * 爆弾設置入力を検証済み前提で処理し，ルーム配信を実行する
 */
import type {
  BombPlacementPort,
  GameOutputPort,
  GameRoomLookupPort,
  PlaceBombInput,
} from "../ports/gameUseCasePorts";

type PlaceBombUseCaseParams = {
  roomResolver: GameRoomLookupPort;
  bombStore: BombPlacementPort;
  input: PlaceBombInput;
  output: Pick<GameOutputPort, "publishBombPlacedToRoom">;
};

/** 爆弾設置入力を重複排除と採番付きでルームへ配信する */
export const placeBombUseCase = ({
  roomResolver,
  bombStore,
  input,
  output,
}: PlaceBombUseCaseParams): void => {
  const roomId = roomResolver.getRoomByPlayerId(input.socketId)?.roomId;
  if (!roomId) {
    return;
  }

  const dedupeKey = `${input.socketId}:${input.payload.requestId}`;
  if (!bombStore.shouldBroadcastBombPlaced(roomId, dedupeKey, input.nowMs)) {
    return;
  }

  output.publishBombPlacedToRoom(roomId, {
    ...input.payload,
    bombId: bombStore.issueServerBombId(roomId),
    ownerId: input.socketId,
  });
};
