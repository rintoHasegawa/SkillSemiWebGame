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
import { resolveRoomIdBySocketId } from "./useCaseRoomResolver";
import type { FindRoomByPlayerPort } from "@server/domains/room/application/ports/roomUseCasePorts";

type PlaceBombUseCaseParams = {
  roomResolver: FindRoomByPlayerPort;
  bombStore: BombPlacementPort;
  input: PlaceBombInput;
  output: BombOutputPort;
};

/** 爆弾設置入力を重複排除と採番付きでルームへ配信する */
export const placeBombUseCase = ({
  roomResolver,
  bombStore,
  input,
  output,
}: PlaceBombUseCaseParams): void => {
  const roomId = resolveRoomIdBySocketId(roomResolver, input.socketId);
  if (!roomId) {
    return;
  }

  const dedupeKey = createBombDedupeKey(input.socketId, input.payload.requestId);
  if (!bombStore.shouldBroadcastBombPlacedForRoom(roomId, dedupeKey, input.nowMs)) {
    return;
  }

  const bombId = bombStore.issueServerBombIdForRoom(roomId);

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
