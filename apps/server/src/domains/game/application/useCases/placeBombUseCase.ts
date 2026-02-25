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
  if (!bombStore.shouldBroadcastBombPlaced(roomId, dedupeKey, input.nowMs)) {
    return;
  }

  output.publishBombPlacedToRoom(
    roomId,
    createBombPlacedPayload({
      payload: input.payload,
      bombId: bombStore.issueServerBombId(roomId),
      ownerId: input.socketId,
    })
  );
};
