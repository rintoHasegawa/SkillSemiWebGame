/**
 * bombPayloadValidation
 * 爆弾設置ペイロードの妥当性検証ロジックを提供する
 * 座標はマップ範囲，爆発予定時刻はゲーム進行時間の範囲に収まることを検証する
 */
import { config as sharedConfig, type PlaceBombPayload } from "@repo/shared";

const MS_PER_SEC = 1000;

// 座標の上限は最大フィールドプリセットのグリッド数とする
const MAX_BOMB_X = sharedConfig.MAX_FIELD_GRID_SIZE.cols;
const MAX_BOMB_Y = sharedConfig.MAX_FIELD_GRID_SIZE.rows;

// 爆発予定時刻の上限は制限時間 + 導火線時間とする（遠未来の居座りを防ぐ）
const MAX_EXPLODE_AT_ELAPSED_MS =
  sharedConfig.GAME_CONFIG.GAME_DURATION_SEC * MS_PER_SEC
  + sharedConfig.GAME_CONFIG.BOMB_FUSE_MS;

// 配列や null を除外し，フィールド参照可能なオブジェクトのみを通す
// network層の同名ヘルパーとは依存方向ルール（domains → network 禁止）により共有しない
const isPayloadObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

// 0以上maxValue以下の有限数か判定する
const isNumberInRange = (
  value: unknown,
  maxValue: number,
): value is number => {
  return (
    typeof value === "number"
    && Number.isFinite(value)
    && value >= 0
    && value <= maxValue
  );
};

/** PLACE_BOMBイベントのペイロードが爆弾設置要求であるか判定する */
export const isPlaceBombPayload = (
  value: unknown,
): value is PlaceBombPayload => {
  if (!isPayloadObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.requestId)
    && isNumberInRange(value.x, MAX_BOMB_X)
    && isNumberInRange(value.y, MAX_BOMB_Y)
    && isNumberInRange(value.explodeAtElapsedMs, MAX_EXPLODE_AT_ELAPSED_MS)
  );
};
