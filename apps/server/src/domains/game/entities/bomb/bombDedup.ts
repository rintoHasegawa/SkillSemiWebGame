/**
 * bombDedup
 * 爆弾設置要求の重複排除テーブル操作を提供する
 */
import { config } from "@repo/shared";

type ShouldBroadcastBombPlacedParams = {
  dedupTable: Map<string, number>;
  dedupeKey: string;
  nowMs: number;
};

type ShouldBroadcastBombHitReportParams = {
  dedupTable: Map<string, number>;
  dedupeKey: string;
  nowMs: number;
};

/** 重複排除テーブルの期限切れエントリを削除する */
export const cleanupExpiredBombDedup = (
  dedupTable: Map<string, number>,
  nowMs: number
): void => {
  dedupTable.forEach((expiresAtMs, key) => {
    if (expiresAtMs <= nowMs) {
      dedupTable.delete(key);
    }
  });
};

/** 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
export const shouldBroadcastBombPlaced = ({
  dedupTable,
  dedupeKey,
  nowMs,
}: ShouldBroadcastBombPlacedParams): boolean => {
  cleanupExpiredBombDedup(dedupTable, nowMs);

  if (dedupTable.has(dedupeKey)) {
    return false;
  }

  const ttlMs = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;
  dedupTable.set(dedupeKey, nowMs + ttlMs);
  return true;
};

/** 被弾報告イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
export const shouldBroadcastBombHitReport = ({
  dedupTable,
  dedupeKey,
  nowMs,
}: ShouldBroadcastBombHitReportParams): boolean => {
  cleanupExpiredBombDedup(dedupTable, nowMs);

  if (dedupTable.has(dedupeKey)) {
    return false;
  }

  const ttlMs = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;
  dedupTable.set(dedupeKey, nowMs + ttlMs);
  return true;
};
