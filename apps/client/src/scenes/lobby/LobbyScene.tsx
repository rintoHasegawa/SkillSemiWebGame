import type { roomTypes } from "@repo/shared";

type Props = {
  room: roomTypes.Room | null;
  myId: string | null;
  onStart: () => void;
};

export const LobbyScene = ({ room, myId, onStart }: Props) => {
  if (!room)
    return <div style={{ color: "white", padding: 40 }}>読み込み中...</div>;

  const isMeOwner = room.ownerId === myId;

  return (
    <>
      \n{" "}
      <style>{`
        /* 全てのエレメントの幅・高さ計算に余白(padding)を含める魔法のCSS */
        * {
          box-sizing: border-box;
        }
        .portrait-blocker {
          display: none;
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100dvh;
          background: #111;
          color: white;
          z-index: 9999;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          font-size: 1.5rem;
          text-align: center;
          padding: 20px;
        }
        @media screen and (orientation: portrait) {
          .portrait-blocker {
            display: flex;
          }
          .lobby-container {
            display: none !important;
          }
        }
        /* スクロールバーの見た目をスマホ・PCでスッキリさせる */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #555;
          border-radius: 4px;
        }
      `}</style>
      <div className="portrait-blocker">
        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🔄</div>
        <p style={{ margin: 0, lineHeight: "1.5" }}>
          このゲームは横画面専用です。
          <br />
          スマホを横向きにしてください。
        </p>
      </div>
      <div
        className="lobby-container"
        style={{
          padding: "20px",
          color: "white",
          background: "#222",
          height: "100dvh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h2
          style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", margin: "0 0 15px 0" }}
        >
          ルーム: {room.roomId} (待機中)
        </h2>

        {/* 🌟 ここから左右に分けるコンテナ (flexDirection: "row" に変更) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            maxWidth: "900px" /* 画面幅が広いPCでも間延びしないように */,
            flexGrow: 1 /* 残りの高さをすべて使う */,
            gap: "20px" /* 左右の要素の隙間 */,
            minHeight: 0 /* flex要素内のスクロールを有効にするためのおまじない */,
          }}
        >
          {/* 🌟 左半分: スタートボタン or 待機メッセージ */}
          <div
            style={{
              flex: 1 /* 左右で1:1の幅にする */,
              display: "flex",
              alignItems: "center" /* 上下中央揃え */,
              justifyContent: "center" /* 左右中央揃え */,
              padding: "10px",
            }}
          >
            {isMeOwner ? (
              <button
                onClick={onStart}
                style={{
                  width: "100%",
                  maxWidth: "350px" /* ボタンが横に伸びすぎないように制限 */,
                  padding: "20px",
                  fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
                  cursor: "pointer",
                  backgroundColor: "#4ade80",
                  color: "#111",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)" /* 立体感を追加 */,
                }}
              >
                ゲームスタート
              </button>
            ) : (
              <div
                style={{
                  width: "100%",
                  maxWidth: "350px",
                  padding: "20px",
                  fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                  backgroundColor: "#555",
                  color: "#ccc",
                  borderRadius: "8px",
                  textAlign: "center",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                }}
              >
                ホストの開始を待っています...
              </div>
            )}
          </div>

          {/* 🌟 右半分: 参加プレイヤーリスト */}
          <div
            style={{
              flex: 1 /* 左右で1:1の幅にする */,
              background: "#333",
              padding: "20px",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              minHeight: 0 /* これがないとスクロールが効かない場合がある */,
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            }}
          >
            <h3
              style={{
                borderBottom: "1px solid #555",
                paddingBottom: "10px",
                margin: "0 0 10px 0",
                fontSize: "clamp(1rem, 3vw, 1.2rem)",
              }}
            >
              参加プレイヤー ({room.players.length}/{room.maxPlayers})
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontSize: "1.1rem",
                overflowY: "auto",
                flexGrow: 1,
                paddingRight: "10px",
              }}
            >
              {room.players.map((p: roomTypes.RoomMember) => (
                <li
                  key={p.id}
                  style={{
                    margin: "10px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span>{p.id === myId ? "🟢" : "⚪"}</span>
                  <span
                    style={{ fontWeight: p.id === myId ? "bold" : "normal" }}
                  >
                    {p.name}
                  </span>
                  {p.isOwner && <span style={{ fontSize: "0.9em" }}>👑</span>}
                  {p.isReady && (
                    <span style={{ marginLeft: "auto", fontSize: "0.9em" }}>
                      ✅
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};
