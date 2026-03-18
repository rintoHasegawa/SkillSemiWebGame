/**
 * LobbySettingsModal
 * ホスト用のゲーム設定（人数・フィールドサイズ・チーム割り当て方式）を変更するモーダル
 */
import type { FieldSizePreset } from "@repo/shared";
import { config } from "@client/config";
import { OVERLAY_BUTTON_STYLE } from "@client/scenes/shared/styles/overlayStyles";
import type { LobbyGameSettings } from "../LobbyScene";
import {
  LOBBY_SETTINGS_MODAL_BODY_STYLE,
  LOBBY_SETTINGS_MODAL_FIELD_STYLE,
  LOBBY_SETTINGS_MODAL_FOOTER_STYLE,
  LOBBY_SETTINGS_MODAL_HEADER_STYLE,
  LOBBY_SETTINGS_MODAL_LABEL_STYLE,
  LOBBY_SETTINGS_MODAL_OVERLAY_STYLE,
  LOBBY_SETTINGS_MODAL_PANEL_STYLE,
  LOBBY_SETTINGS_MODAL_SELECT_STYLE,
} from "./LobbySettingsModal.styles";

type LobbySettingsModalProps = {
  startPlayerCountOptions: number[];
  settings: LobbyGameSettings;
  onChangeSettings: (settings: LobbyGameSettings) => void;
  onClose: () => void;
};

const FIELD_PRESET_OPTIONS = Object.keys(config.GAME_CONFIG.FIELD_PRESETS) as FieldSizePreset[];

export const toFieldPresetLabel = (preset: FieldSizePreset): string => {
  const range = config.GAME_CONFIG.FIELD_PRESETS[preset].recommendedPlayers;
  const baseLabel =
    preset === "SMALL"
      ? "小"
      : preset === "MEDIUM"
        ? "中"
        : preset === "LARGE"
          ? "大"
          : "極大";
  return `${baseLabel} (${range.min}-${range.max}人目安)`;
};

/** ホスト用ゲーム設定ポップアップ */
export const LobbySettingsModal = ({
  startPlayerCountOptions,
  settings,
  onChangeSettings,
  onClose,
}: LobbySettingsModalProps) => {
  return (
    <div style={LOBBY_SETTINGS_MODAL_OVERLAY_STYLE}>
      <div style={LOBBY_SETTINGS_MODAL_PANEL_STYLE}>
        <div style={LOBBY_SETTINGS_MODAL_HEADER_STYLE}>ゲーム設定</div>

        <div style={LOBBY_SETTINGS_MODAL_BODY_STYLE}>
          <div style={LOBBY_SETTINGS_MODAL_FIELD_STYLE}>
            <label
              htmlFor="settings-modal-start-player-count"
              style={LOBBY_SETTINGS_MODAL_LABEL_STYLE}
            >
              ゲーム人数
            </label>
            <select
              id="settings-modal-start-player-count"
              value={settings.targetPlayerCount}
              onChange={(event) => {
                onChangeSettings({ ...settings, targetPlayerCount: Number(event.target.value) });
              }}
              style={LOBBY_SETTINGS_MODAL_SELECT_STYLE}
            >
              {startPlayerCountOptions.map((count) => (
                <option key={count} value={count}>
                  {count}人
                </option>
              ))}
            </select>
          </div>

          <div style={LOBBY_SETTINGS_MODAL_FIELD_STYLE}>
            <label
              htmlFor="settings-modal-field-size-preset"
              style={LOBBY_SETTINGS_MODAL_LABEL_STYLE}
            >
              フィールドサイズ
            </label>
            <select
              id="settings-modal-field-size-preset"
              value={settings.fieldSizePreset}
              onChange={(event) => {
                onChangeSettings({ ...settings, fieldSizePreset: event.target.value as FieldSizePreset });
              }}
              style={LOBBY_SETTINGS_MODAL_SELECT_STYLE}
            >
              {FIELD_PRESET_OPTIONS.map((preset) => (
                <option key={preset} value={preset}>
                  {toFieldPresetLabel(preset)}
                </option>
              ))}
            </select>
          </div>

          <div style={LOBBY_SETTINGS_MODAL_FIELD_STYLE}>
            <label
              htmlFor="settings-modal-team-assignment-mode"
              style={LOBBY_SETTINGS_MODAL_LABEL_STYLE}
            >
              チームの決め方
            </label>
            <select
              id="settings-modal-team-assignment-mode"
              value={settings.teamAssignmentMode}
              onChange={(event) => {
                onChangeSettings({
                  ...settings,
                  teamAssignmentMode: event.target.value as LobbyGameSettings["teamAssignmentMode"],
                });
              }}
              style={LOBBY_SETTINGS_MODAL_SELECT_STYLE}
            >
              <option value="random">ランダム（自動割り当て）</option>
              <option value="player_select">プレイヤーが選択</option>
            </select>
          </div>
        </div>

        <div style={LOBBY_SETTINGS_MODAL_FOOTER_STYLE}>
          <button onClick={onClose} style={OVERLAY_BUTTON_STYLE}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
