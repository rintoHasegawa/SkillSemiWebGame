/**
 * bombDedup
 * 爆弾設置・被弾報告イベントの重複排除テーブル操作を提供する
 * 保持時間はテーブルごとに異なるため，登録時にTTLを受け取って適用する
 */
import { config } from "@repo/shared";

type BombDedupParams = {
  dedupTable: Map<string, number>;
  dedupeKey: string;
  nowMs: number;
};

type MarkDedupeKeyParams = BombDedupParams & {
  ttlMs: number;
};

// 設置イベントの重複排除保持時間（導火線時間＋追加猶予）
const BOMB_PLACED_DEDUP_TTL_MS =
  config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;

/**
 * 被弾報告の重複排除保持時間（導火線時間＋爆発後の受理猶予＋追加猶予）
 * 受理窓（爆発予定時刻＋受理猶予）は設置時刻から最大で
 * BOMB_FUSE_MS + BOMB_HIT_REPORT_RETENTION_MS となる
 * TTLを受理窓と同じ長さにすると，設置と同時刻に報告した場合に
 * 「窓が閉じる境界時刻」でTTLも同時に切れ，同一報告が二重加算され得る
 * 追加猶予を上乗せしてTTLを受理窓より必ず長くし，境界での二重加算を防ぐ
 */
const BOMB_HIT_REPORT_DEDUP_TTL_MS =
  config.GAME_CONFIG.BOMB_FUSE_MS
  + config.GAME_CONFIG.BOMB_HIT_REPORT_RETENTION_MS
  + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;

/**
 * 重複排除テーブルの期限切れエントリを先頭から削除する
 * 1つのテーブル内では常に同じTTLで登録するため挿入順が期限順となり，期限内の
 * エントリへ到達した時点で走査を打ち切れる．毎回の全表走査を避け，連打時の
 * 走査量を登録数に対して線形に保つ
 * この不変条件を保つため，同一テーブルへ異なるTTLを混在させてはならない
 * （設置用と被弾報告用はTTLが異なるので別テーブルとして扱う）
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
  ttlMs,
}: MarkDedupeKeyParams): boolean => {
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
  return markDedupeKeyIfAbsent({
    ...params,
    ttlMs: BOMB_PLACED_DEDUP_TTL_MS,
  });
};

/**
 * 被弾報告イベントを配信すべきか判定し，配信時は重複排除状態を更新する
 * 受理窓より長いTTLで登録し，窓の内側での再報告を二重加算させない
 * 現在時刻が非有限の場合は期限を決められないため配信不可として扱う
 */
export const shouldBroadcastBombHitReport = (
  params: BombDedupParams,
): boolean => {
  return markDedupeKeyIfAbsent({
    ...params,
    ttlMs: BOMB_HIT_REPORT_DEDUP_TTL_MS,
  });
};
