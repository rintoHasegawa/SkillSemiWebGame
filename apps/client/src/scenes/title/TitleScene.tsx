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
      {/* 🌟 ロビー画面と同じ、横画面専用の警告と全体設定 */}
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
          text-align: center;
          padding: 20px;
        }
        @media screen and (orientation: portrait) {
          .portrait-blocker {
            display: flex;
          }
        }
      `}</style>

      {/* 縦画面時のブロック画面 */}
      <div className="portrait-blocker">
        <h2>画面を横向きにしてください</h2>
        <p>Please rotate your device to landscape mode.</p>
      </div>

      {/* 🌟 画面全体を覆う背景コンテナ */}
      <div
        style={{
          width: "100vw",
          height: "100dvh",
          // 💡 ここを修正： public/title.png を読み込むように変更
          backgroundImage: "url('/title.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          // ドット絵をぼやけさせずにくっきり拡大するプロパティ
          imageRendering: "pixelated",

          // UIを下の方に配置するためのFlexbox設定
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end", // 下に寄せる
          alignItems: "center",
          paddingBottom: "12vh", // 画像の空きスペースに合わせて調整
        }}
      >
        {/* 🌟 入力フォーム＆ボタンのコンテナ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "90%",
            maxWidth: "400px",
            // 画像と同化しないように、うっすらと黒い半透明の座布団を敷く（不要なら消してOK）
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "100%",
              marginBottom: "20px",
            }}
          >
            <input
              placeholder="プレイヤー名を入力"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                padding: "12px",
                fontSize: "clamp(1rem, 3vw, 1.2rem)",
                borderRadius: "5px",
                border: "none",
                width: "100%",
                fontFamily: "monospace",
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
                fontFamily: "monospace",
              }}
            />
          </div>

          {/* エラーメッセージ */}
          {joinErrorMessage && (
            <div
              style={{
                color: "#ff6b6b",
                marginBottom: "15px",
                fontWeight: "bold",
                textAlign: "center",
                textShadow: "1px 1px 2px black",
              }}
            >
              {joinErrorMessage}
            </div>
          )}

          {/* 参加ボタン */}
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
              width: "100%",
              fontWeight: "bold",
              fontFamily: "monospace",
              transition: "background-color 0.2s",
            }}
          >
            {isJoining ? "接続中..." : "GAME START"}
          </button>
        </div>
      </div>
    </>
  );
};
