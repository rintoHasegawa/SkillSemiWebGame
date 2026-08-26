/**
 * ReconnectingNotice
 * プレイ中の切断から席へ復帰するまでの待機状態を伝えるコンポーネント
 * 操作できないゲーム画面を残さず，復帰待ちであることだけを表示する
 * 回線が戻らない限り待機のまま留まるため，タイトルへ戻る導線も併せて提供する
 */
import {
  RECONNECTING_NOTICE_BUTTON_STYLE,
  RECONNECTING_NOTICE_MESSAGE_STYLE,
  RECONNECTING_NOTICE_ROOT_STYLE,
} from "./ReconnectingNotice.styles";

type Props = {
  onBackToTitle: () => void;
};

/** 席への復帰待ちであることと，タイトルへ戻る導線を表示する */
export const ReconnectingNotice = ({ onBackToTitle }: Props) => {
  return (
    <div style={RECONNECTING_NOTICE_ROOT_STYLE}>
      <p style={RECONNECTING_NOTICE_MESSAGE_STYLE}>再接続中...</p>

      {/* 回線が戻らない限り復帰待ちのまま留まるため，自力で抜ける導線を残す */}
      <button
        type="button"
        style={RECONNECTING_NOTICE_BUTTON_STYLE}
        onClick={onBackToTitle}
      >
        タイトルへ戻る
      </button>
    </div>
  );
};
