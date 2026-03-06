import type { CSSProperties } from "react";
import {
  OVERLAY_PANEL_BASE_STYLE,
  OVERLAY_PANEL_FOOTER_BASE_STYLE,
  OVERLAY_PANEL_HEADER_BASE_STYLE,
} from "@client/scenes/shared/styles/overlayStyles";

export const LOBBY_RULE_MODAL_OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.72)",
  zIndex: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

export const LOBBY_RULE_MODAL_PANEL_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_BASE_STYLE,
  width: "min(760px, 100%)",
  maxHeight: "min(78dvh, 820px)",
  display: "flex",
  flexDirection: "column",
};

export const LOBBY_RULE_MODAL_HEADER_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_HEADER_BASE_STYLE,
  fontSize: "1.1rem",
  fontWeight: 800,
};

export const LOBBY_RULE_MODAL_BODY_STYLE: CSSProperties = {
  padding: "14px 18px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

export const LOBBY_RULE_MODAL_SECTION_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

export const LOBBY_RULE_MODAL_SECTION_TITLE_STYLE: CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 800,
};

export const LOBBY_RULE_MODAL_LIST_STYLE: CSSProperties = {
  margin: 0,
  paddingLeft: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

export const LOBBY_RULE_MODAL_FOOTER_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_FOOTER_BASE_STYLE,
  display: "flex",
  justifyContent: "flex-end",
};
