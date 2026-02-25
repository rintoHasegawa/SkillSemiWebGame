/**
 * createBombRoomStateStoreAdapter
 * 爆弾状態ストア実装をネットワーク層向けの入力ポートへ変換する
 */
import type { BombRoomStateStorePort } from "@server/domains/game/application/ports/gameUseCasePorts";
import {
  clearBombRoomState,
  issueServerBombId,
  shouldBroadcastBombPlaced,
} from "@server/domains/game/entities/bomb/BombRoomStateStore";

/** 爆弾状態ストア入力ポートの実装を生成する */
export const createBombRoomStateStoreAdapter = (): BombRoomStateStorePort => {
  return {
    clearBombRoomState,
    issueServerBombId,
    shouldBroadcastBombPlaced,
  };
};
