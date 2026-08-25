/**
 * lobbySettingsSync
 * ロビーのホスト設定とルーム現在設定の同期判定を行う純ロジック
 * オーナー移譲時の巻き戻り防止と，設定送信要否・ゲーム開始要求値の決定を担う
 */
import { config as sharedConfig } from "@repo/shared";
import type { FieldSizePreset, TeamAssignmentMode, domain } from "@repo/shared";

/** ホスト側で管理するゲーム設定 */
export type LobbyGameSettings = {
  targetPlayerCount: number;
  fieldSizePreset: FieldSizePreset;
  teamAssignmentMode: TeamAssignmentMode;
};

/** room の設定値のうち同期対象だけを抜き出した形 */
export type LobbyRoomSettings = Pick<
  domain.room.Room,
  "targetPlayerCount" | "fieldSizePreset" | "teamAssignmentMode"
>;

/** 設定送信の要否判定に必要な入力 */
export type ShouldPushLobbySettingsParams = {
  isMeOwner: boolean;
  /** room の現在設定をローカルへ取り込み済みか */
  hasAdoptedRoomSettings: boolean;
  roomSettings: LobbyRoomSettings;
  localSettings: LobbyGameSettings;
  /** 直近に送信した設定（未送信は null） */
  lastPushedSettings: LobbyGameSettings | null;
};

/** ゲーム開始要求値の決定に必要な入力 */
export type ResolveStartGameRequestParams = {
  hasAdoptedRoomSettings: boolean;
  roomSettings: LobbyRoomSettings;
  localSettings: LobbyGameSettings;
};

/** START_GAME に載せるロビー由来の設定値 */
export type LobbyStartGameRequest = {
  targetPlayerCount: number;
  fieldSizePreset: FieldSizePreset;
};

// サーバー由来の値が想定外の文字列でも壊れないよう，割り当て方式を明示的に判定する
const isTeamAssignmentMode = (value: unknown): value is TeamAssignmentMode => {
  return value === "random" || value === "player_select";
};

/** room の現在設定を採用し，欠損・不正値は defaults へフォールバックした設定を返す */
export const resolveGameSettingsFromRoom = (
  roomSettings: LobbyRoomSettings,
  defaults: LobbyGameSettings,
): LobbyGameSettings => {
  return {
    targetPlayerCount:
      roomSettings.targetPlayerCount ?? defaults.targetPlayerCount,
    fieldSizePreset: sharedConfig.isFieldSizePreset(roomSettings.fieldSizePreset)
      ? roomSettings.fieldSizePreset
      : defaults.fieldSizePreset,
    teamAssignmentMode: isTeamAssignmentMode(roomSettings.teamAssignmentMode)
      ? roomSettings.teamAssignmentMode
      : defaults.teamAssignmentMode,
  };
};

/** 2 つのロビー設定が同値かを判定する */
export const isSameLobbyGameSettings = (
  a: LobbyGameSettings,
  b: LobbyGameSettings,
): boolean => {
  return (
    a.targetPlayerCount === b.targetPlayerCount
    && a.fieldSizePreset === b.fieldSizePreset
    && a.teamAssignmentMode === b.teamAssignmentMode
  );
};

/** ホストのローカル設定をサーバーへ送信すべきかを判定する */
export const shouldPushLobbySettings = ({
  isMeOwner,
  hasAdoptedRoomSettings,
  roomSettings,
  localSettings,
  lastPushedSettings,
}: ShouldPushLobbySettingsParams): boolean => {
  if (!isMeOwner) {
    return false;
  }

  // 取り込み前の送信はオーナー移譲直後に既定値でルーム設定を巻き戻すため禁止する
  if (!hasAdoptedRoomSettings) {
    return false;
  }

  // ルームの目標人数が未設定のときは初期値をサーバーへ確定させる必要があるため差分ありとみなす
  const isRoomTargetPlayerCountUnset = roomSettings.targetPlayerCount == null;
  const hasRoomDifference =
    isRoomTargetPlayerCountUnset
    || !isSameLobbyGameSettings(
      localSettings,
      resolveGameSettingsFromRoom(roomSettings, localSettings),
    );
  if (!hasRoomDifference) {
    return false;
  }

  // 同値の再送はサーバーが受理しない場合に無限ループとなるため防ぐ
  return (
    lastPushedSettings === null
    || !isSameLobbyGameSettings(localSettings, lastPushedSettings)
  );
};

/** START_GAME 要求に載せる目標人数・フィールドサイズを決定する */
export const resolveStartGameRequest = ({
  hasAdoptedRoomSettings,
  roomSettings,
  localSettings,
}: ResolveStartGameRequestParams): LobbyStartGameRequest => {
  // 取り込み済みならホストの変更が room へ反映される前でもローカル値の方が新しい
  const settings = hasAdoptedRoomSettings
    ? localSettings
    : resolveGameSettingsFromRoom(roomSettings, localSettings);

  return {
    targetPlayerCount: settings.targetPlayerCount,
    fieldSizePreset: settings.fieldSizePreset,
  };
};
