import { useEffect, useMemo, useState } from "react";
import { domain } from "@repo/shared";
import type { FieldSizePreset, StartGameRequestPayload } from "@repo/shared";
import { config } from "@client/config";
import { OVERLAY_BUTTON_STYLE } from "@client/scenes/shared/styles/overlayStyles";
import { LobbyRuleModal } from "./components/LobbyRuleModal";

type Props = {
  room: domain.room.Room | null;
  myId: string | null;
  onStart: (payload: StartGameRequestPayload) => void;
  onBackToTitle: () => void;
};

export const LobbyScene = ({ room, myId, onStart, onBackToTitle }: Props) => {
  if (!room)
    return <div style={{ color: "white", padding: 40 }}>読み込み中...</div>;

  const isMeOwner = room.ownerId === myId;
  const teamUnit = 4;
  const minimumStartPlayerCount = useMemo(() => {
    return Math.max(
      teamUnit,
      Math.ceil(room.players.length / teamUnit) * teamUnit,
    );
  }, [room.players.length]);

  const maxStartPlayerCount = useMemo(() => {
    return Math.max(
      minimumStartPlayerCount,
      Math.floor(room.maxPlayers / teamUnit) * teamUnit,
    );
  }, [minimumStartPlayerCount, room.maxPlayers]);

  const startPlayerCountOptions = useMemo(() => {
    const options: number[] = [];
    for (
      let count = minimumStartPlayerCount;
      count <= maxStartPlayerCount;
      count += teamUnit
    ) {
      options.push(count);
    }

    return options;
  }, [minimumStartPlayerCount, maxStartPlayerCount]);

  const [selectedStartPlayerCount, setSelectedStartPlayerCount] = useState(
    minimumStartPlayerCount,
  );
  const fieldPresetOptions = useMemo(() => {
    return Object.keys(
      config.GAME_CONFIG.FIELD_PRESETS,
    ) as FieldSizePreset[];
  }, []);
  const [selectedFieldSizePreset, setSelectedFieldSizePreset] =
    useState<FieldSizePreset>(config.GAME_CONFIG.DEFAULT_FIELD_PRESET);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  useEffect(() => {
    setSelectedStartPlayerCount((prev) => {
      if (prev < minimumStartPlayerCount || prev > maxStartPlayerCount) {
        return minimumStartPlayerCount;
      }

      if (prev % teamUnit !== 0) {
        return minimumStartPlayerCount;
      }

      return prev;
    });
  }, [minimumStartPlayerCount, maxStartPlayerCount]);

  const handleStart = () => {
    onStart({
      targetPlayerCount: selectedStartPlayerCount,
      fieldSizePreset: selectedFieldSizePreset,
    });
  };

  const toFieldPresetLabel = (preset: FieldSizePreset): string => {
    const range = config.GAME_CONFIG.FIELD_PRESETS[preset].recommendedPlayers;
    const baseLabel =
      preset === "SMALL"
        ? "小"
        : preset === "MEDIUM"
          ? "中"
          : preset === "LARGE"
            ? "大"
            : "極大";

    return `${baseLabel} (${range.min}-${range.max}人目安)`;
  };

  return (
    <>
      <style>{`
        /* 全てのエレメントの幅・高さ計算に余白(padding)を含める魔法のCSS */
        * {
          box-sizing: border-box;
        }

        .lobby-main-layout {
          display: flex;
          flex-direction: row;
          width: 100%;
          flex-grow: 1;
          gap: 20px;
          min-height: 0;
        }

        .lobby-player-list {
          list-style: none;
          padding: 0 10px 0 0;
          margin: 0;
          font-size: 1.1rem;
          overflow-y: auto;
          flex-grow: 1;
          min-height: 0;
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
          backgroundImage: "url('/LobbyAni2.webp')", // ここで画像を読み込み
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0, // UIの背面レイヤーとして表示する
          pointerEvents: "none",
          filter: "brightness(0.4)", // UIの文字を見やすくするために画像を少し暗くする
        }}
      />

      <div
        className="lobby-container"
        style={{
          position: "fixed",
          inset: 0,
          padding: "20px",
          color: "white",
          // 🌟 変更：元の "#222" (真っ黒) から "transparent" (透明) に変更！
          background: "transparent",
          height: "100dvh",
          width: "100vw",
          overflowX: "hidden",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
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

        <div className="lobby-main-layout">
          {/* 左半分: スタートボタン or 待機メッセージ */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              padding: "10px",
            }}
          >
            <button
              onClick={onBackToTitle}
              style={{
                ...OVERLAY_BUTTON_STYLE,
                alignSelf: "flex-start",
                marginBottom: "14px",
              }}
            >
              タイトルへ戻る
            </button>

            <div
              style={{
                width: "100%",
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isMeOwner ? (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "350px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <label
                    htmlFor="start-player-count"
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
                    }}
                  >
                    ゲーム人数
                  </label>
                  <select
                    id="start-player-count"
                    value={selectedStartPlayerCount}
                    onChange={(event) => {
                      setSelectedStartPlayerCount(Number(event.target.value));
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.4)",
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  >
                    {startPlayerCountOptions.map((count) => (
                      <option key={count} value={count}>
                        {count}人
                      </option>
                    ))}
                  </select>

                  <label
                    htmlFor="field-size-preset"
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
                    }}
                  >
                    フィールドサイズ
                  </label>
                  <select
                    id="field-size-preset"
                    value={selectedFieldSizePreset}
                    onChange={(event) => {
                      setSelectedFieldSizePreset(event.target.value as FieldSizePreset);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.4)",
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  >
                    {fieldPresetOptions.map((preset) => (
                      <option key={preset} value={preset}>
                        {toFieldPresetLabel(preset)}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleStart}
                    style={{
                      width: "100%",
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

                  <button
                    onClick={() => {
                      setIsRuleModalOpen(true);
                    }}
                    style={{
                      ...OVERLAY_BUTTON_STYLE,
                      width: "100%",
                    }}
                  >
                    ルールを見る
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "350px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
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

                  <button
                    onClick={() => {
                      setIsRuleModalOpen(true);
                    }}
                    style={{
                      ...OVERLAY_BUTTON_STYLE,
                      width: "100%",
                    }}
                  >
                    ルールを見る
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 右半分: 参加プレイヤーリスト */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
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
              className="lobby-player-list"
            >
              {room.players.map((p: domain.room.RoomMember) => (
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

      {isRuleModalOpen && (
        <LobbyRuleModal
          onClose={() => {
            setIsRuleModalOpen(false);
          }}
        />
      )}
    </>
  );
};
