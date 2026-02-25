import { useState } from "react";
// ルーム参加時送信ペイロード型
import type { roomTypes } from "@repo/shared";

type Props = {
  // 入室実行時呼び出しコールバック
  onJoin: (payload: roomTypes.JoinRoomPayload) => void;
  // 入室失敗時の表示メッセージ
  joinErrorMessage: string | null;
  // 入室リクエスト送信中フラグ
  isJoining: boolean;
};

export const TitleScene = ({ onJoin, joinErrorMessage, isJoining }: Props) => {
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
    <>
      {/* 🌟 追加: ロビー画面と同じ、横画面専用の警告と全体設定 */}
      <style>{`
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
          .title-container {
            display: none !important;
          }
        }
      `}</style>

      {/* 🌟 縦画面のときに表示される警告画面 */}
      <div className="portrait-blocker">
        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🔄</div>
        <p style={{ margin: 0, lineHeight: "1.5" }}>
          このゲームは横画面専用です。
          <br />
          スマホを横向きにしてください。
        </p>
      </div>

      <div
        className="title-container"
        style={{
          padding: "20px",
          color: "white",
          background: "#111",
          height: "100dvh" /* 🌟 100vhから100dvhに変更（スマホURLバー対策） */,
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h1
          style={{
            fontSize:
              "clamp(2rem, 5vw, 3rem)" /* 🌟 画面サイズに合わせて文字を可変に */,
            marginBottom: "clamp(20px, 4vh, 40px)",
            color: "#4ade80",
            textAlign: "center",
          }}
        >
          Pixel Paint War
        </h1>

        {/* 🌟 固定の300pxから、幅100%・最大幅350pxのレスポンシブに変更 */}
        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
            maxWidth: "350px",
          }}
        >
          <input
            placeholder="プレイヤー名"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              padding: "12px",
              fontSize: "clamp(1rem, 3vw, 1.2rem)",
              borderRadius: "5px",
              border: "none",
              width: "100%",
            }}
          />
          <input
            placeholder="ルームIDを入力"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            style={{
              padding: "12px",
              fontSize: "clamp(1rem, 3vw, 1.2rem)",
              borderRadius: "5px",
              border: "none",
              width: "100%",
            }}
          />
        </div>

        {/* 🌟 エラーメッセージの表示（もしあれば） */}
        {joinErrorMessage && (
          <div
            style={{
              color: "#ef4444",
              marginBottom: "15px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {joinErrorMessage}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={!canJoin || isJoining}
          style={{
            padding: "15px 30px",
            fontSize: "clamp(1rem, 3vw, 1.2rem)",
            cursor: !canJoin || isJoining ? "not-allowed" : "pointer",
            backgroundColor: !canJoin || isJoining ? "#555" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "5px",
            width: "100%" /* 🌟 ボタンも入力欄と同じ幅に揃える */,
            maxWidth: "350px",
            fontWeight: "bold",
          }}
        >
          {isJoining ? "入室中..." : "ルームに参加"}
        </button>
      </div>
    </>
  );
};
