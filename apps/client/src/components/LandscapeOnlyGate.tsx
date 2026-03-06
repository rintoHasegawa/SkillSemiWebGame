/**
 * LandscapeOnlyGate
 * 横画面専用コンテンツのゲートコンポーネント
 * ポートレートモード時はコンテンツを非表示にし，横向き要求メッセージを表示する
 */

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** 横画面時のみ children を表示し，縦画面時は回転要求オーバーレイを表示するゲート */
export const LandscapeOnlyGate = ({ children }: Props) => {
  return (
    <>
      {/* レイアウトとポートレート時の表示切り替えスタイル */}
      <style>{`
        .landscape-only-gate {
          width: 100vw;
          height: 100dvh;
        }

        .landscape-only-content {
          width: 100%;
          height: 100%;
        }

        .landscape-only-blocker {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #111;
          color: #fff;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          text-align: center;
          padding: 20px;
        }

        @media screen and (orientation: portrait) {
          .landscape-only-blocker {
            display: flex;
          }

          .landscape-only-content {
            display: none;
          }
        }
      `}</style>

      <div className="landscape-only-gate">
        {/* ポートレート時に全面表示する回転要求オーバーレイ */}
        <div className="landscape-only-blocker">
          <h2>画面を横向きにしてください</h2>
          <p>Please rotate your device to landscape mode.</p>
        </div>

        {/* ランドスケープ時に表示するコンテンツ領域 */}
        <div className="landscape-only-content">{children}</div>
      </div>
    </>
  );
};
