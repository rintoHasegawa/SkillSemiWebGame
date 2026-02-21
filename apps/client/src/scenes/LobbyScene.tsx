import type { Room } from "@repo/shared/src/types/room";

type Props = {
  room: Room | null;
  myId: string | null;
  onStart: () => void;
};

export const LobbyScene = ({ room, myId, onStart }: Props) => {
  // ルーム情報到着前ローディング表示
  if (!room) return <div style={{ color: "white", padding: 40 }}>読み込み中...</div>;

  // 自身オーナー権限判定
  const isMeOwner = room.ownerId === myId;

  // ロビー画面本体
  return (
    <div style={{ padding: 40, color: "white", background: "#222", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "20px" }}>ルーム: {room.roomId} (待機中)</h2>
      
      <div style={{ margin: "20px 0", background: "#333", padding: "20px", borderRadius: "8px", width: "400px" }}>
        <h3 style={{ borderBottom: "1px solid #555", paddingBottom: "10px" }}>
          参加プレイヤー ({room.players.length}/{room.maxPlayers})
        </h3>
        <ul style={{ listStyle: "none", padding: 0, fontSize: "1.2rem" }}>
          {/* 参加プレイヤー一覧描画 */}
          {room.players.map((p) => (
            <li key={p.id} style={{ margin: "15px 0", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>{p.id === myId ? "🟢" : "⚪"}</span>
              <span style={{ fontWeight: p.id === myId ? "bold" : "normal" }}>{p.name}</span>
              {p.isOwner && <span style={{ fontSize: "0.9em" }}>👑</span>}
              {p.isReady && <span style={{ marginLeft: "auto", fontSize: "0.9em" }}>✅</span>}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "20px" }}>
        {/* オーナー開始操作と待機表示の分岐 */}
        {isMeOwner ? (
          <button
            onClick={onStart}
            style={{ padding: "15px 40px", fontSize: "1.2rem", background: "#ef4444", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            ゲームスタート
          </button>
        ) : (
          <p style={{ color: "#aaa", fontSize: "1.2rem" }}>オーナーがゲームを開始するのを待っています...</p>
        )}
      </div>
    </div>
  );
};