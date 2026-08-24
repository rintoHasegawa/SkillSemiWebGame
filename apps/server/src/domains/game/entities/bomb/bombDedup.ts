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

/**
 * 重複排除テーブルの期限切れエントリを先頭から削除する
 * 登録は常に同じTTLで行うため挿入順が期限順となり，期限内のエントリへ到達した
 * 時点で走査を打ち切れる．毎回の全表走査を避け，連打時の走査量を登録数に対して
 * 線形に保つ
 */
const cleanupExpiredBombDedup = (
  dedupTable: Map<string, number>,
  nowMs: number
): void => {
  for (const [key, expiresAtMs] of dedupTable) {
    // 非有限の期限は比較が常に false となり永久に残留するため除去する
    if (Number.isFinite(expiresAtMs) && expiresAtMs > nowMs) {
      break;
    }

    dedupTable.delete(key);
  }
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

  // 走査打ち切りより後ろに残った期限切れは未登録とみなす
  const expiresAtMs = dedupTable.get(dedupeKey);
  const isActiveEntry =
    expiresAtMs !== undefined &&
    Number.isFinite(expiresAtMs) &&
    expiresAtMs > nowMs;
  if (isActiveEntry) {
    return false;
  }

  const ttlMs =
    config.GAME_CONFIG.BOMB_FUSE_MS +
    config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;
  // 挿入順を期限順に保つため，再登録時は既存エントリを削除してから登録する
  dedupTable.delete(dedupeKey);
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
