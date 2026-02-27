/**
 * socketPayloadValidators
 * ソケット受信ペイロードの型ガードを提供する
 */
import type {
  domain,
  PlaceBombPayload,
  BombHitReportPayload,
} from "@repo/shared";
import type { PingPayload } from "@repo/shared";
import { isPlaceBombPayload as isValidPlaceBombPayload } from "@server/domains/game/entities/bomb/bombPayloadValidation";

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

/** PINGイベントのペイロードが数値であるか判定する */
export const isPingPayload = (value: unknown): value is PingPayload => {
  return isFiniteNumber(value);
};

/** MOVEイベントのペイロードが移動座標であるか判定する */
export const isMovePayload = (
  value: unknown,
): value is domain.player.MovePayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y);
};

/** PLACE_BOMBイベントのペイロードが爆弾設置要求であるか判定する */
export const isPlaceBombPayload = (
  value: unknown,
): value is PlaceBombPayload => {
  return isValidPlaceBombPayload(value);
};

/** BOMB_HIT_REPORTイベントのペイロードが被弾報告であるか判定する */
export const isBombHitReportPayload = (
  value: unknown,
): value is BombHitReportPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isNonEmptyString(candidate.bombId);
};

/** START_GAMEイベントのペイロードが開始要求情報であるか判定する */
export const isStartGamePayload = (
  value: unknown,
): value is { targetPlayerCount?: number } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const targetPlayerCount = candidate.targetPlayerCount;
  if (targetPlayerCount === undefined) {
    return true;
  }

  return (
    typeof targetPlayerCount === "number" &&
    Number.isInteger(targetPlayerCount) &&
    targetPlayerCount > 0
  );
};

/** JOIN_ROOMイベントのペイロードが参加情報であるか判定する */
export const isJoinRoomPayload = (
  value: unknown,
): value is domain.room.JoinRoomPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.roomId) && isNonEmptyString(candidate.playerName)
  );
};
