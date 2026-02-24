import { useState } from "react";
// ルーム参加時送信ペイロード型
import type { roomTypes } from "@repo/shared";

type Props = {
  // 入室実行時呼び出しコールバック
  onJoin: (payload: roomTypes.JoinRoomPayload) => void;
  // 入室失敗時の表示メッセージ
  joinErrorMessage: string | null;
};

export const TitleScene = ({ onJoin, joinErrorMessage }: Props) => {
  // プレイヤー名入力値
  const [playerName, setPlayerName] = useState("");
  // ルームID入力値
  const [roomIdInput, setRoomIdInput] = useState("");

  // 入室ボタン活性条件
  const canJoin = playerName !== "" && roomIdInput !== "";

  // 入室実行ハンドラ
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

      {joinErrorMessage && (
        <p style={{ marginTop: "14px", color: "#f87171", fontWeight: "bold" }}>{joinErrorMessage}</p>
      )}
    </div>
  );
};