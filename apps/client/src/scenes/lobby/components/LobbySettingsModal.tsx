/**
 * LobbySettingsModal
 * ホスト用のゲーム設定（人数・フィールドサイズ）を変更するモーダル
 */
import type { FieldSizePreset } from "@repo/shared";
import { OVERLAY_BUTTON_STYLE } from "@client/scenes/shared/styles/overlayStyles";
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
  selectedStartPlayerCount: number;
  onChangeStartPlayerCount: (count: number) => void;
  fieldPresetOptions: FieldSizePreset[];
  selectedFieldSizePreset: FieldSizePreset;
  onChangeFieldSizePreset: (preset: FieldSizePreset) => void;
  toFieldPresetLabel: (preset: FieldSizePreset) => string;
  onClose: () => void;
};

/** ホスト用ゲーム設定ポップアップ */
export const LobbySettingsModal = ({
  startPlayerCountOptions,
  selectedStartPlayerCount,
  onChangeStartPlayerCount,
  fieldPresetOptions,
  selectedFieldSizePreset,
  onChangeFieldSizePreset,
  toFieldPresetLabel,
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
              value={selectedStartPlayerCount}
              onChange={(event) => {
                onChangeStartPlayerCount(Number(event.target.value));
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
              value={selectedFieldSizePreset}
              onChange={(event) => {
                onChangeFieldSizePreset(event.target.value as FieldSizePreset);
              }}
              style={LOBBY_SETTINGS_MODAL_SELECT_STYLE}
            >
              {fieldPresetOptions.map((preset) => (
                <option key={preset} value={preset}>
                  {toFieldPresetLabel(preset)}
                </option>
              ))}
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
