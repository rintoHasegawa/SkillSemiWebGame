import { useState } from "react";
// sharedからのインポート（パスは環境に合わせて調整してください）
import type { JoinRoomPayload } from "@repo/shared/src/types/room";

type Props = {
  // バラバラの引数から、共通のペイロード型に変更
  onJoin: (payload: JoinRoomPayload) => void;
};

export const TitleScene = ({ onJoin }: Props) => {
  const [playerName, setPlayerName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");

  // 元の条件を維持（両方入力されていればOK）
  const canJoin = playerName !== "" && roomIdInput !== "";

  const handleJoin = () => {
    if (canJoin) {
      onJoin({ roomId: roomIdInput, playerName });
    }
  };

  return (
    <div style={{ padding: 40, color: "white", background: "#111", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "40px", color: "#4ade80" }}>Pixel Paint War</h1>
      
      <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px", width: "300px" }}>
        <input
          placeholder="プレイヤー名"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ padding: "12px", fontSize: "1.2rem", borderRadius: "5px", border: "none" }}
        />
        <input
          placeholder="ルームIDを入力"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          style={{ padding: "12px", fontSize: "1.2rem", borderRadius: "5px", border: "none" }}
        />
      </div>
      
      <button
        onClick={handleJoin}
        disabled={!canJoin}
        style={{
          padding: "15px 30px",
          fontSize: "1.2rem",
          cursor: !canJoin ? "not-allowed" : "pointer",
          backgroundColor: !canJoin ? "#555" : "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "5px",
          width: "300px",
          fontWeight: "bold"
        }}
      >
        ルームに入る / 作る
      </button>
    </div>
  );
};