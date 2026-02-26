/**
 * placeBombUseCase
 * 爆弾設置入力を検証済み前提で処理し，ルーム配信を実行する
 */
import type {
  BombPlacementPort,
  BombOutputPort,
  PlaceBombInput,
} from "../ports/gameUseCasePorts";
import {
  createBombPlacedAckPayload,
  createBombDedupeKey,
  createBombPlacedPayload,
} from "@server/domains/game/entities/bomb/bombPlacement";

type PlaceBombUseCaseParams = {
  roomId: string;
  bombStore: BombPlacementPort;
  input: PlaceBombInput;
  output: BombOutputPort;
};

/** 爆弾設置入力を重複排除と採番付きでルームへ配信する */
export const placeBombUseCase = ({
  roomId,
  bombStore,
  input,
  output,
}: PlaceBombUseCaseParams): void => {
  const dedupeKey = createBombDedupeKey(input.socketId, input.payload.requestId);
  if (!bombStore.shouldBroadcastBombPlaced(dedupeKey, input.nowMs)) {
    return;
  }

  const bombId = bombStore.issueServerBombId();

  output.publishBombPlacedToOthersInRoom(
    roomId,
    input.socketId,
    createBombPlacedPayload({
      payload: input.payload,
      bombId,
    })
  );

  output.publishBombPlacedAckToSocket(
    input.socketId,
    createBombPlacedAckPayload({
      requestId: input.payload.requestId,
      bombId,
    })
  );
};
