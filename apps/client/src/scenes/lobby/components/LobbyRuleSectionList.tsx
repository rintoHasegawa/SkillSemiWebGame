import {
  LOBBY_RULE_MODAL_LIST_STYLE,
  LOBBY_RULE_MODAL_SECTION_STYLE,
  LOBBY_RULE_MODAL_SECTION_TITLE_STYLE,
} from "./LobbyRuleModal.styles";
import type { LobbyRuleSection } from "../presentation/lobbyRuleContent";

type LobbyRuleSectionListProps = {
  sections: LobbyRuleSection[];
};

export const LobbyRuleSectionList = ({
  sections,
}: LobbyRuleSectionListProps) => {
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} style={LOBBY_RULE_MODAL_SECTION_STYLE}>
          <h3 style={LOBBY_RULE_MODAL_SECTION_TITLE_STYLE}>{section.title}</h3>
          <ul style={LOBBY_RULE_MODAL_LIST_STYLE}>
            {section.lines.map((line, index) => (
              <li key={`${section.id}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
};
