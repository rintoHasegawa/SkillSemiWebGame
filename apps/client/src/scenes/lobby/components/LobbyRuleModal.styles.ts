import type { CSSProperties } from "react";

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
  width: "min(760px, 100%)",
  maxHeight: "min(78dvh, 820px)",
  borderRadius: "12px",
  background: "rgba(20, 20, 20, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.45)",
  color: "white",
  display: "flex",
  flexDirection: "column",
};

export const LOBBY_RULE_MODAL_HEADER_STYLE: CSSProperties = {
  padding: "16px 18px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.16)",
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
  padding: "14px 18px",
  borderTop: "1px solid rgba(255, 255, 255, 0.16)",
  display: "flex",
  justifyContent: "flex-end",
};
