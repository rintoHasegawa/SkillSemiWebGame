/**
 * installGuideIcons
 * インストールゲートの手順に添えるインライン SVG アイコン群
 * 外部画像に依存せず currentColor で描画し，装飾用途のため支援技術からは隠す
 */

import type { ReactElement } from "react";

/** 手順に添えるアイコンコンポーネントの型 */
export type InstallGuideIcon = () => ReactElement;

// 手順アイコンの共通描画サイズ（px）
const ICON_SIZE_PX = 26;

// 線画アイコン共通の svg 属性
const STROKE_ICON_PROPS = {
  width: ICON_SIZE_PX,
  height: ICON_SIZE_PX,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
} as const;

// 塗りアイコン共通の svg 属性
const FILL_ICON_PROPS = {
  width: ICON_SIZE_PX,
  height: ICON_SIZE_PX,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true,
  focusable: "false",
} as const;

// トグルのオン状態に使う色（ゲート内の追加ボタンと同系色）
const TOGGLE_ON_COLOR = "#4caf50";

/** iOS の共有ボタン（上辺の開いた四角と上向き矢印）を表すアイコン */
export const ShareIcon: InstallGuideIcon = () => (
  <svg {...STROKE_ICON_PROPS}>
    <path d="M8 10H5v10h14V10h-3" />
    <path d="M12 3v11" />
    <path d="M8 7l4-4 4 4" />
  </svg>
);

/** ホーム画面に追加（角丸四角の中に＋）を表すアイコン */
export const AddToHomeScreenIcon: InstallGuideIcon = () => (
  <svg {...STROKE_ICON_PROPS}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

/** オン状態のトグルスイッチを表すアイコン */
export const ToggleOnIcon: InstallGuideIcon = () => (
  <svg {...FILL_ICON_PROPS}>
    <rect x="2" y="7" width="20" height="10" rx="5" fill={TOGGLE_ON_COLOR} />
    <circle cx="17" cy="12" r="3.4" fill="#fff" />
  </svg>
);

/** ブラウザメニュー（縦 3 点）を表すアイコン */
export const BrowserMenuIcon: InstallGuideIcon = () => (
  <svg {...FILL_ICON_PROPS}>
    <circle cx="12" cy="5.5" r="1.8" fill="currentColor" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <circle cx="12" cy="18.5" r="1.8" fill="currentColor" />
  </svg>
);

/** 確認ダイアログでの決定（丸にチェック）を表すアイコン */
export const ConfirmIcon: InstallGuideIcon = () => (
  <svg {...STROKE_ICON_PROPS}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);

/** ホーム画面のアイコンからの起動（角丸四角の中に再生マーク）を表すアイコン */
export const AppLaunchIcon: InstallGuideIcon = () => (
  <svg {...STROKE_ICON_PROPS}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" />
  </svg>
);

/** URL のコピー（鎖）を表すアイコン */
export const LinkIcon: InstallGuideIcon = () => (
  <svg {...STROKE_ICON_PROPS}>
    <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" />
    <path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" />
  </svg>
);

/** Safari（コンパス）を表すアイコン */
export const SafariIcon: InstallGuideIcon = () => (
  <svg {...STROKE_ICON_PROPS}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z" />
  </svg>
);
