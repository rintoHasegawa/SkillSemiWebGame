/**
 * placeBombUseCase
 * 爆弾設置入力を検証済み前提で処理し，ルーム配信を実行する
 */
import type {
  BombPlacementPort,
  BombPlacementOutputPort,
  PlaceBombInput,
} from "../ports/gameUseCasePorts";
import {
  createBombPlacedAckPayload,
  createBombDedupeKey,
  createBombPlacedPayload,
} from "@server/domains/game/entities/bomb/bombPlacement";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";

type PlaceBombUseCaseParams = {
  roomId: string;
  bombStore: BombPlacementPort;
  input: PlaceBombInput;
  output: BombPlacementOutputPort;
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

  // ゲーム終了直後に届いた設置要求は採番できないため，記録して無視する
  const bombId = bombStore.issueServerBombId();
  if (!bombId) {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.PLACE_BOMB,
      result: logResults.IGNORED_SESSION_NOT_STARTED,
      socketId: input.socketId,
      roomId,
    });
    return;
  }

  const ownerTeamId = bombStore.getPlayerTeamId(input.socketId);

  bombStore.registerActiveBomb({
    bombId,
    ownerPlayerId: input.socketId,
    x: input.payload.x,
    y: input.payload.y,
    explodeAtElapsedMs: input.payload.explodeAtElapsedMs,
  });

  output.publishBombPlacedToOthersInRoom(
    roomId,
    input.socketId,
    createBombPlacedPayload({
      payload: input.payload,
      bombId,
      ownerTeamId,
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
