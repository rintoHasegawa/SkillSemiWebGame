import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export const LandscapeOnlyGate = ({ children }: Props) => {
  return (
    <>
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
        <div className="landscape-only-blocker">
          <h2>画面を横向きにしてください</h2>
          <p>Please rotate your device to landscape mode.</p>
        </div>

        <div className="landscape-only-content">{children}</div>
      </div>
    </>
  );
};
