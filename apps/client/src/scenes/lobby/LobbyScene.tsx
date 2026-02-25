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
          padding: "20px" /* 🌟 余白をスマホ向けに少しスッキリと */,
          color: "white",
          background: "#222",
          height:
            "100dvh" /* 🌟 vhではなくdvh(スマホのURLバー等を考慮した正確な高さ)を使用 */,
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center" /* 🌟 縦方向も中央揃えに */,
        }}
      >
        <h2
          style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", margin: "0 0 10px 0" }}
        >
          ルーム: {room.roomId} (待機中)
        </h2>

        <div
          style={{
            margin: "10px 0",
            background: "#333",
            padding: "20px",
            borderRadius: "8px",
            width: "100%" /* 🌟 常に親要素の100%の幅にする */,
            maxWidth:
              "500px" /* 🌟 ただし、最大でも500pxまでしか広がらないようにする */,
            display: "flex",
            flexDirection: "column",
            maxHeight:
              "50vh" /* 🌟 スマホ横画面では高さが厳しいので、リスト枠の高さも可変に */,
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
              overflowY:
                "auto" /* 🌟 maxHeightを親に任せて、ここではみ出し分をスクロール */,
              flexGrow: 1 /* 🌟 親枠の中で余った高さを全部使う */,
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
                <span style={{ fontWeight: p.id === myId ? "bold" : "normal" }}>
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

        <div
          style={{
            marginTop: "10px",
            width: "100%",
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          {isMeOwner ? (
            <button
              onClick={onStart}
              style={{
                width: "100%" /* 🌟 ボタンも押しやすいように幅広に */,
                padding: "12px",
                fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                cursor: "pointer",
                backgroundColor: "#4ade80",
                color: "#111",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
              }}
            >
              ゲームスタート
            </button>
          ) : (
            <div
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                backgroundColor: "#555",
                color: "#ccc",
                borderRadius: "8px",
              }}
            >
              ホストの開始を待っています...
            </div>
          )}
        </div>
      </div>
    </>
  );
};
