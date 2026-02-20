import { useState } from "react";

type Props = {
  onJoin: (roomId: string, playerName: string) => void;
};

export const TitleScene = ({ onJoin }: Props) => {
  const [playerName, setPlayerName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");

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
        onClick={() => onJoin(roomIdInput, playerName)}
        disabled={!playerName || !roomIdInput}
        style={{
          padding: "15px 30px",
          fontSize: "1.2rem",
          cursor: (!playerName || !roomIdInput) ? "not-allowed" : "pointer",
          backgroundColor: (!playerName || !roomIdInput) ? "#555" : "#3b82f6",
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