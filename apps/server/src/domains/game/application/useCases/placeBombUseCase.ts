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

  // クライアント側クールダウンをすり抜けた連投はサーバー側で拒否する（requestId 差し替え対策）
  if (!bombStore.shouldAcceptBombPlacement(input.socketId, input.nowMs)) {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.PLACE_BOMB,
      result: logResults.REJECTED_COOLDOWN,
      socketId: input.socketId,
      roomId,
    });
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

  // 爆発予定時刻はクライアント申告値を採用せずサーバー経過時間から決める
  const explodeAtElapsedMs = bombStore.resolveBombExplodeAtElapsedMs(
    input.nowMs,
  );

  bombStore.registerActiveBomb({
    bombId,
    ownerPlayerId: input.socketId,
    x: input.payload.x,
    y: input.payload.y,
    explodeAtElapsedMs,
  });

  output.publishBombPlacedToOthersInRoom(
    roomId,
    input.socketId,
    createBombPlacedPayload({
      payload: { ...input.payload, explodeAtElapsedMs },
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
