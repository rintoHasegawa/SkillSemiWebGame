import type { roomTypes } from "@repo/shared";

type Props = {
  room: roomTypes.Room | null;
  myId: string | null;
  onStart: () => void;
};

export const LobbyScene = ({ room, myId, onStart }: Props) => {
  // ルーム情報到着前ローディング表示
  if (!room)
    return <div style={{ color: "white", padding: 40 }}>読み込み中...</div>;

  // 自身オーナー権限判定
  const isMeOwner = room.ownerId === myId;

  // ロビー画面本体
  return (
    <div
      style={{
        padding: 40,
        color: "white",
        background: "#222",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h2 style={{ fontSize: "2rem", marginBottom: "20px" }}>
        ルーム: {room.roomId} (待機中)
      </h2>

      <div
        style={{
          margin: "20px 0",
          background: "#333",
          padding: "20px",
          borderRadius: "8px",
          width: "400px",
        }}
      >
        <h3
          style={{
            borderBottom: "1px solid #555",
            paddingBottom: "10px",
            margin: "0 0 10px 0",
          }}
        >
          参加プレイヤー ({room.players.length}/{room.maxPlayers})
        </h3>

        {/* 🌟 変更部分: ulタグにスクロール設定を追加 */}
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            fontSize: "1.2rem",
            maxHeight:
              "300px" /* 🌟 リストの最大の高さを指定（これを超えるとスクロールになる） */,
            overflowY: "auto" /* 🌟 縦方向のスクロールを有効化 */,
            paddingRight:
              "10px" /* 🌟 スクロールバーと文字が被らないように右側に少し余白を確保 */,
          }}
        >
          {/* 参加プレイヤー一覧描画 */}
          {room.players.map((p: roomTypes.RoomMember) => (
            <li
              key={p.id}
              style={{
                margin: "15px 0",
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

      <div style={{ marginTop: "20px" }}>
        {/* オーナー開始操作と待機表示の分岐 */}
        {isMeOwner ? (
          <button
            onClick={onStart}
            style={{
              padding: "15px 40px",
              fontSize: "1.5rem",
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
              padding: "15px 40px",
              fontSize: "1.5rem",
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
  );
};
