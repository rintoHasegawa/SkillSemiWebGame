/**
 * bombPayloadValidation
 * 爆弾設置ペイロードの妥当性検証ロジックを提供する
 */
import type { PlaceBombPayload } from "@repo/shared";

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

/** PLACE_BOMBイベントのペイロードが爆弾設置要求であるか判定する */
export const isPlaceBombPayload = (value: unknown): value is PlaceBombPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.requestId)
    && isFiniteNumber(candidate.x)
    && isFiniteNumber(candidate.y)
    && isFiniteNumber(candidate.explodeAtElapsedMs)
  );
};
