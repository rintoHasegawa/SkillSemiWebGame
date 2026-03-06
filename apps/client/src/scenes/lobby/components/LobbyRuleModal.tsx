import { OVERLAY_BUTTON_STYLE } from "@client/scenes/shared/styles/overlayStyles";
import {
  LOBBY_RULE_MODAL_BODY_STYLE,
  LOBBY_RULE_MODAL_FOOTER_STYLE,
  LOBBY_RULE_MODAL_HEADER_STYLE,
  LOBBY_RULE_MODAL_OVERLAY_STYLE,
  LOBBY_RULE_MODAL_PANEL_STYLE,
} from "./LobbyRuleModal.styles";
import { LOBBY_RULE_SECTIONS } from "../presentation/lobbyRuleContent";
import { LobbyRuleSectionList } from "./LobbyRuleSectionList";

type LobbyRuleModalProps = {
  onClose: () => void;
};

export const LobbyRuleModal = ({ onClose }: LobbyRuleModalProps) => {
  return (
    <div style={LOBBY_RULE_MODAL_OVERLAY_STYLE}>
      <div style={LOBBY_RULE_MODAL_PANEL_STYLE}>
        <div style={LOBBY_RULE_MODAL_HEADER_STYLE}>ルール</div>

        <div style={LOBBY_RULE_MODAL_BODY_STYLE}>
          <LobbyRuleSectionList sections={LOBBY_RULE_SECTIONS} />
        </div>

        <div style={LOBBY_RULE_MODAL_FOOTER_STYLE}>
          <button onClick={onClose} style={OVERLAY_BUTTON_STYLE}>
            ロビーに戻る
          </button>
        </div>
      </div>
    </div>
  );
};
