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
  // 🌟 追加：「TAP TO START」が押されてフォームを表示する状態かどうか
  const [showForm, setShowForm] = useState(false);

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
      <style>{`
        * {
          box-sizing: border-box;
        }
        /* 🌟 追加：文字を点滅させるアニメーション */
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>

      {/* 画面全体を覆う背景コンテナ */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100lvh",
          overflow: "hidden",
          backgroundImage: "url('/title.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: "12vh",
          // 🌟 追加：フォーム表示前なら、画面全体をタップ可能なボタンのようにする
          cursor: showForm ? "default" : "pointer",
        }}
        // 🌟 追加：背景のどこかをタップしたらフォームを表示する
        onClick={() => {
          if (!showForm) setShowForm(true);
        }}
      >
        {/* 🌟 条件分岐：showForm が false なら「TAP TO START」、true ならフォームを表示 */}
        {!showForm ? (
          <div
            style={{
              color: "white",
              fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
              fontFamily: "monospace",
              fontWeight: "bold",
              textShadow:
                "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
              animation: "blink 1.5s infinite", // ここで点滅アニメーションを適用
              marginBottom: "30px", // 少し上に浮かせる
            }}
          >
            - TAP TO START -
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "90%",
              maxWidth: "400px",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
              // 🌟 追加：フワッと表示させる簡単なアニメーション
              animation: "fadeIn 0.3s ease-in-out",
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
        )}
      </div>

      {/* React内でインラインのkeyframes(fadeIn)を追加するためのハック */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};
