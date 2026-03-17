/**
 * LobbyStartConfirmModal
 * ゲームスタート前の確認ダイアログ
 */
import { OVERLAY_BUTTON_STYLE } from "@client/scenes/shared/styles/overlayStyles";
import {
  LOBBY_START_CONFIRM_BODY_STYLE,
  LOBBY_START_CONFIRM_FOOTER_STYLE,
  LOBBY_START_CONFIRM_HEADER_STYLE,
  LOBBY_START_CONFIRM_OVERLAY_STYLE,
  LOBBY_START_CONFIRM_PANEL_STYLE,
  LOBBY_START_CONFIRM_YES_BUTTON_STYLE,
} from "./LobbyStartConfirmModal.styles";

type LobbyStartConfirmModalProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

/** ゲームスタートの最終確認を表示するモーダル */
export const LobbyStartConfirmModal = ({
  onConfirm,
  onCancel,
}: LobbyStartConfirmModalProps) => {
  return (
    <div style={LOBBY_START_CONFIRM_OVERLAY_STYLE}>
      <div style={LOBBY_START_CONFIRM_PANEL_STYLE}>
        <div style={LOBBY_START_CONFIRM_HEADER_STYLE}>ゲームスタート</div>

        <div style={LOBBY_START_CONFIRM_BODY_STYLE}>
          ゲームを開始しますか？
        </div>

        <div style={LOBBY_START_CONFIRM_FOOTER_STYLE}>
          <button onClick={onCancel} style={OVERLAY_BUTTON_STYLE}>
            いいえ
          </button>
          <button onClick={onConfirm} style={LOBBY_START_CONFIRM_YES_BUTTON_STYLE}>
            はい
          </button>
        </div>
      </div>
    </div>
  );
};
