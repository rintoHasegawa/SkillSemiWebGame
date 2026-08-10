/**
 * bombDedup
 * 爆弾設置・被弾報告イベントの重複排除テーブル操作を提供する
 */
import { config } from "@repo/shared";

type BombDedupParams = {
  dedupTable: Map<string, number>;
  dedupeKey: string;
  nowMs: number;
};

/** 重複排除テーブルの期限切れエントリを削除する */
const cleanupExpiredBombDedup = (
  dedupTable: Map<string, number>,
  nowMs: number
): void => {
  dedupTable.forEach((expiresAtMs, key) => {
    // 非有限の期限は比較が常に false となり永久に残留するため除去する
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
      dedupTable.delete(key);
    }
  });
};

// 期限切れを掃除したうえで未登録キーのみ期限付きで登録し，可否を返す
const markDedupeKeyIfAbsent = ({
  dedupTable,
  dedupeKey,
  nowMs,
}: BombDedupParams): boolean => {
  // 現在時刻が非有限の場合は期限を決められないため配信不可として扱う
  if (!Number.isFinite(nowMs)) {
    return false;
  }

  cleanupExpiredBombDedup(dedupTable, nowMs);

  if (dedupTable.has(dedupeKey)) {
    return false;
  }

  const ttlMs =
    config.GAME_CONFIG.BOMB_FUSE_MS +
    config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;
  dedupTable.set(dedupeKey, nowMs + ttlMs);
  return true;
};

/**
 * 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する
 * 現在時刻が非有限の場合は期限を決められないため配信不可として扱う
 */
export const shouldBroadcastBombPlaced = (
  params: BombDedupParams,
): boolean => {
  return markDedupeKeyIfAbsent(params);
};

/**
 * 被弾報告イベントを配信すべきか判定し，配信時は重複排除状態を更新する
 * 現在時刻が非有限の場合は期限を決められないため配信不可として扱う
 */
export const shouldBroadcastBombHitReport = (
  params: BombDedupParams,
): boolean => {
  return markDedupeKeyIfAbsent(params);
};
