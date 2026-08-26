/**
 * ReconnectingNotice.styles
 * 再接続待ち表示のスタイル定数を定義する
 * 画面全体を覆う暗転面と，中央寄せの文言・操作ボタンで構成する
 */
import type { CSSProperties } from "react";

/** 再接続待ち表示の全面ルートスタイル */
export const RECONNECTING_NOTICE_ROOT_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "16px",
  padding: "40px",
  boxSizing: "border-box",
  background: "#111",
  color: "white",
  textAlign: "center",
};

/** 再接続中であることを伝える見出しのスタイル */
export const RECONNECTING_NOTICE_MESSAGE_STYLE: CSSProperties = {
  margin: 0,
  fontSize: "1.1rem",
  fontWeight: 700,
};

/** 復帰待ちから自力で抜けるためのボタンスタイル */
export const RECONNECTING_NOTICE_BUTTON_STYLE: CSSProperties = {
  padding: "10px 14px",
  fontSize: "0.95rem",
  cursor: "pointer",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  background: "rgba(0, 0, 0, 0.55)",
  color: "white",
  fontWeight: 700,
};
