/**
 * ResultActionBar
 * リザルト画面の操作ボタンを表示する
 * タイトル遷移と最終マップ表示への切り替えを担当する
 */
import {
  OVERLAY_BUTTON_ROW_STYLE,
  OVERLAY_BUTTON_STYLE,
} from "@client/scenes/shared/styles/overlayStyles";

type Props = {
  onBackToTitle: () => void;
  onShowMapPreview: () => void;
};

/** リザルト画面の操作ボタン行を描画するコンポーネント */
export const ResultActionBar = ({ onBackToTitle, onShowMapPreview }: Props) => {
  return (
    <div style={OVERLAY_BUTTON_ROW_STYLE}>
      <button onClick={onBackToTitle} style={OVERLAY_BUTTON_STYLE}>
        タイトルへ戻る
      </button>

      <button onClick={onShowMapPreview} style={OVERLAY_BUTTON_STYLE}>
        最終マップを見る
      </button>
    </div>
  );
};
