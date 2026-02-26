import type { roomTypes } from "@repo/shared";

type Props = {
  room: roomTypes.Room | null;
  myId: string | null;
  onStart: () => void;
  onBackToTitle: () => void;
};

export const LobbyScene = ({ room, myId, onStart, onBackToTitle }: Props) => {
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
        /* スクロールバーの見た目をスマホ・PCでスッキリさせる */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #555;
          border-radius: 4px;
        }
      `}</style>

      {/* 🌟🌟 追加：背景のWebPアニメーション 🌟🌟 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100dvh",
          backgroundImage: "url('/LobbyAni.webp')", // ここで画像を読み込み
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: -1, // UIの一番後ろに配置
          filter: "brightness(0.4)", // UIの文字を見やすくするために画像を少し暗くする
        }}
      />

      <div
        className="lobby-container"
        style={{
          padding: "20px",
          color: "white",
          // 🌟 変更：元の "#222" (真っ黒) から "transparent" (透明) に変更！
          background: "transparent",
          height: "100dvh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            margin: "0 0 15px 0",
            // 🌟 追加：文字が背景に埋もれないように影をつける
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          ルーム: {room.roomId} (待機中)
        </h2>

        <button
          onClick={onBackToTitle}
          style={{
            alignSelf: "flex-start",
            marginBottom: "14px",
            padding: "10px 14px",
            fontSize: "0.95rem",
            cursor: "pointer",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.4)",
            background: "rgba(0,0,0,0.55)",
            color: "white",
            fontWeight: 700,
          }}
        >
          タイトルへ戻る
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            maxWidth: "900px",
            flexGrow: 1,
            gap: "20px",
            minHeight: 0,
          }}
        >
          {/* 左半分: スタートボタン or 待機メッセージ */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            {isMeOwner ? (
              <button
                onClick={onStart}
                style={{
                  width: "100%",
                  maxWidth: "350px",
                  padding: "20px",
                  fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
                  cursor: "pointer",
                  backgroundColor: "#4ade80",
                  color: "#111",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
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

          {/* 右半分: 参加プレイヤーリスト */}
          <div
            style={{
              flex: 1,
              // 🌟 変更：ベタ塗りのグレーから、後ろの動画がうっすら透ける黒に変更！
              background: "rgba(0, 0, 0, 0.6)",
              padding: "20px",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
              // 🌟 追加：透け感を引き立たせるための薄い枠線
              border: "1px solid rgba(255, 255, 255, 0.1)",
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
