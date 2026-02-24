import type { playerTypes, roomTypes } from "@repo/shared";

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const isPingPayload = (value: unknown): value is number => {
  return isFiniteNumber(value);
};

export const isMovePayload = (value: unknown): value is playerTypes.MovePayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y);
};

export const isJoinRoomPayload = (value: unknown): value is roomTypes.JoinRoomPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isNonEmptyString(candidate.roomId) && isNonEmptyString(candidate.playerName);
};
