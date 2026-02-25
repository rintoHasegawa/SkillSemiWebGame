/**
 * socketPayloadValidators
 * ソケット受信ペイロードの型ガードを提供する
 */
import type { playerTypes, roomTypes } from "@repo/shared";
import type { PingPayload } from "@repo/shared";

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
export const isMovePayload = (value: unknown): value is playerTypes.MovePayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y);
};

/** JOIN_ROOMイベントのペイロードが参加情報であるか判定する */
export const isJoinRoomPayload = (value: unknown): value is roomTypes.JoinRoomPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isNonEmptyString(candidate.roomId) && isNonEmptyString(candidate.playerName);
};
