/**
 * GameInitErrorOverlay
 * ゲームシーンの初期化失敗を全面表示で伝えるプレゼンテーションコンポーネント
 * 再読み込みや別ブラウザでの再試行を案内する
 */
import {
  GAME_VIEW_INIT_ERROR_OVERLAY_STYLE,
  GAME_VIEW_INIT_ERROR_TEXT_STYLE,
  GAME_VIEW_INIT_ERROR_TITLE_STYLE,
} from "@client/scenes/game/styles/GameView.styles";

/** 初期化失敗時のエラーオーバーレイを描画する */
export const GameInitErrorOverlay = () => {
  return (
    <div style={GAME_VIEW_INIT_ERROR_OVERLAY_STYLE}>
      <div style={GAME_VIEW_INIT_ERROR_TITLE_STYLE}>
        ゲームを開始できませんでした
      </div>
      <div style={GAME_VIEW_INIT_ERROR_TEXT_STYLE}>
        お使いのブラウザで描画を初期化できませんでした，ページを再読み込みするか別のブラウザでお試しください
      </div>
    </div>
  );
};
