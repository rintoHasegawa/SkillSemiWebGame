/**
 * socketPayloadValidators
 * ソケット受信ペイロードの型ガードを提供する
 */
import { domain } from "@repo/shared";
import type {
  LobbySettingsUpdatePayload,
  PlaceBombPayload,
  BombHitReportPayload,
  SelectTeamPayload,
  StartGameRequestPayload,
} from "@repo/shared";
import type { PingPayload } from "@repo/shared";
import { config as sharedConfig } from "@repo/shared";
import {
  isPlaceBombPayload as isValidPlaceBombPayload,
  MAX_BOMB_ID_LENGTH,
} from "@server/domains/game/entities/bomb/bombPayloadValidation";

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

// 配列や null を除外し，フィールド参照可能なオブジェクトのみを通す
const isPayloadObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// 人数指定に利用できる正の整数か判定する
const isPositiveInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

/** PINGイベントのペイロードが数値であるか判定する */
export const isPingPayload = (value: unknown): value is PingPayload => {
  return isFiniteNumber(value);
};

/** MOVEイベントのペイロードが移動座標であるか判定する */
export const isMovePayload = (
  value: unknown,
): value is domain.game.player.MovePayload => {
  if (!isPayloadObject(value)) {
    return false;
  }

  return isFiniteNumber(value.x) && isFiniteNumber(value.y);
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
  if (!isPayloadObject(value)) {
    return false;
  }

  // 巨大な bombId が重複排除テーブルへ固定されないよう最大長も検証する
  return (
    isNonEmptyString(value.bombId)
    && value.bombId.length <= MAX_BOMB_ID_LENGTH
  );
};

/** START_GAMEイベントのペイロードが開始要求情報であるか判定する */
export const isStartGamePayload = (
  value: unknown,
): value is StartGameRequestPayload => {
  if (!isPayloadObject(value)) {
    return false;
  }

  const { targetPlayerCount, fieldSizePreset } = value;

  // 各項目は省略可能とし，指定された場合のみ内容を検証する
  if (
    targetPlayerCount !== undefined
    && !isPositiveInteger(targetPlayerCount)
  ) {
    return false;
  }

  return (
    fieldSizePreset === undefined
    || sharedConfig.isFieldSizePreset(fieldSizePreset)
  );
};

/** LOBBY_SETTINGS_UPDATEイベントのペイロードがロビー設定情報であるか判定する */
export const isLobbySettingsUpdatePayload = (
  value: unknown,
): value is LobbySettingsUpdatePayload => {
  if (!isPayloadObject(value)) {
    return false;
  }

  const { targetPlayerCount, fieldSizePreset, teamAssignmentMode } = value;

  const isValidMode = (
    teamAssignmentMode === "random"
    || teamAssignmentMode === "player_select"
  );

  return (
    isPositiveInteger(targetPlayerCount)
    && sharedConfig.isFieldSizePreset(fieldSizePreset)
    && isValidMode
  );
};

/** SELECT_TEAMイベントのペイロードがチーム選択情報であるか判定する */
export const isSelectTeamPayload = (
  value: unknown,
): value is SelectTeamPayload => {
  if (!isPayloadObject(value)) {
    return false;
  }

  const { preferredTeamId } = value;

  // null（ランダム希望）以外は有効チーム範囲（0〜TEAM_COUNT-1）に限定する
  return (
    preferredTeamId === null
    || (typeof preferredTeamId === "number"
      && sharedConfig.isKnownTeamId(preferredTeamId))
  );
};

/**
 * JOIN_ROOMイベントのペイロードが参加情報であるか判定する
 * 長さ・文字種の条件は shared の判定へ委譲し，client の入力制限と揃える
 */
export const isJoinRoomPayload = (
  value: unknown,
): value is domain.room.JoinRoomPayload => {
  if (!isPayloadObject(value)) {
    return false;
  }

  const { roomId, playerName } = value;

  return (
    typeof roomId === "string"
    && typeof playerName === "string"
    && domain.room.isValidRoomId(roomId)
    && domain.room.isValidPlayerName(playerName)
  );
};
