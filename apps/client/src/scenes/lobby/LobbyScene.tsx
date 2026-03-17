import { useEffect, useMemo, useState } from "react";
import { domain } from "@repo/shared";
import type { FieldSizePreset, StartGameRequestPayload } from "@repo/shared";
import { config } from "@client/config";
import { socketManager } from "@client/network/SocketManager";
import { OVERLAY_BUTTON_STYLE } from "@client/scenes/shared/styles/overlayStyles";
import { GearIcon } from "./components/GearIcon";
import { LobbyRuleModal } from "./components/LobbyRuleModal";
import { LobbySettingsModal } from "./components/LobbySettingsModal";
import { LobbyStartConfirmModal } from "./components/LobbyStartConfirmModal";
import {
  LOBBY_BACK_BUTTON_STYLE,
  LOBBY_BACKGROUND_STYLE,
  LOBBY_CONTAINER_STYLE,
  LOBBY_CONTROLS_BLOCK_STYLE,
  LOBBY_HOST_SETTINGS_LABEL_STYLE,
  LOBBY_HOST_SETTINGS_STYLE,
  LOBBY_HOST_SETTINGS_VALUE_STYLE,
  LOBBY_LEFT_INNER_STYLE,
  LOBBY_LEFT_PANEL_STYLE,
  LOBBY_PLAYER_LIST_HEADER_STYLE,
  LOBBY_PLAYER_LIST_ITEM_STYLE,
  LOBBY_PLAYER_LIST_PANEL_STYLE,
  LOBBY_SETTINGS_GEAR_BUTTON_STYLE,
  LOBBY_START_BUTTON_STYLE,
  LOBBY_TITLE_STYLE,
  LOBBY_WAITING_STYLE,
} from "./styles/LobbyScene.styles";

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
  const [isStartConfirmVisible, setIsStartConfirmVisible] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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

  // ホストが設定を変更したらサーバーに通知して全員に反映する
  useEffect(() => {
    if (!isMeOwner) {
      return;
    }

    socketManager.lobby.updateLobbySettings({
      targetPlayerCount: selectedStartPlayerCount,
      fieldSizePreset: selectedFieldSizePreset,
    });
  }, [isMeOwner, selectedStartPlayerCount, selectedFieldSizePreset]);

  const handleStartClick = () => {
    setIsStartConfirmVisible(true);
  };

  const handleStartConfirm = () => {
    setIsStartConfirmVisible(false);
    onStart({
      targetPlayerCount: selectedStartPlayerCount,
      fieldSizePreset: selectedFieldSizePreset,
    });
  };

  const handleStartCancel = () => {
    setIsStartConfirmVisible(false);
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
        * { box-sizing: border-box; }
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
          touch-action: pan-y;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background-color: #555; border-radius: 4px; }
      `}</style>

      {/* 背景アニメーション */}
      <div style={LOBBY_BACKGROUND_STYLE} />

      <div className="lobby-container" style={LOBBY_CONTAINER_STYLE}>
        <button
          onClick={onBackToTitle}
          style={{ ...OVERLAY_BUTTON_STYLE, ...LOBBY_BACK_BUTTON_STYLE }}
        >
          タイトルへ戻る
        </button>

        {isMeOwner && (
          <button
            onClick={() => { setIsSettingsModalOpen(true); }}
            style={LOBBY_SETTINGS_GEAR_BUTTON_STYLE}
            aria-label="ゲーム設定"
          >
            <GearIcon size={22} />
          </button>
        )}

        <h2 style={LOBBY_TITLE_STYLE}>
          ルーム: {room.roomId} (待機中)
        </h2>

        <div className="lobby-main-layout">
          {/* 左半分: スタートボタン or 待機メッセージ */}
          <div style={LOBBY_LEFT_PANEL_STYLE}>
            <div style={LOBBY_LEFT_INNER_STYLE}>
              {isMeOwner ? (
                <div style={LOBBY_CONTROLS_BLOCK_STYLE}>
                  <button onClick={handleStartClick} style={LOBBY_START_BUTTON_STYLE}>
                    ゲームスタート
                  </button>

                  <button
                    onClick={() => { setIsRuleModalOpen(true); }}
                    style={{ ...OVERLAY_BUTTON_STYLE, width: "100%" }}
                  >
                    ルールを見る
                  </button>
                </div>
              ) : (
                <div style={LOBBY_CONTROLS_BLOCK_STYLE}>
                  <div style={LOBBY_WAITING_STYLE}>
                    ホストの開始を待っています...
                  </div>

                  <div style={LOBBY_HOST_SETTINGS_STYLE}>
                    <div>
                      <div style={LOBBY_HOST_SETTINGS_LABEL_STYLE}>ゲーム人数</div>
                      <div style={LOBBY_HOST_SETTINGS_VALUE_STYLE}>
                        {room.targetPlayerCount != null
                          ? `${room.targetPlayerCount}人`
                          : "未設定"}
                      </div>
                    </div>
                    <div>
                      <div style={LOBBY_HOST_SETTINGS_LABEL_STYLE}>フィールドサイズ</div>
                      <div style={LOBBY_HOST_SETTINGS_VALUE_STYLE}>
                        {toFieldPresetLabel(room.fieldSizePreset)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setIsRuleModalOpen(true); }}
                    style={{ ...OVERLAY_BUTTON_STYLE, width: "100%" }}
                  >
                    ルールを見る
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 右半分: 参加プレイヤーリスト */}
          <div style={LOBBY_PLAYER_LIST_PANEL_STYLE}>
            <h3 style={LOBBY_PLAYER_LIST_HEADER_STYLE}>
              参加プレイヤー ({room.players.length}/{room.maxPlayers})
            </h3>
            <ul className="lobby-player-list">
              {room.players.map((p: domain.room.RoomMember) => (
                <li key={p.id} style={LOBBY_PLAYER_LIST_ITEM_STYLE}>
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
        </div>
      </div>

      {isRuleModalOpen && (
        <LobbyRuleModal
          onClose={() => { setIsRuleModalOpen(false); }}
        />
      )}

      {isStartConfirmVisible && (
        <LobbyStartConfirmModal
          onConfirm={handleStartConfirm}
          onCancel={handleStartCancel}
        />
      )}

      {isSettingsModalOpen && (
        <LobbySettingsModal
          startPlayerCountOptions={startPlayerCountOptions}
          selectedStartPlayerCount={selectedStartPlayerCount}
          onChangeStartPlayerCount={setSelectedStartPlayerCount}
          fieldPresetOptions={fieldPresetOptions}
          selectedFieldSizePreset={selectedFieldSizePreset}
          onChangeFieldSizePreset={setSelectedFieldSizePreset}
          toFieldPresetLabel={toFieldPresetLabel}
          onClose={() => { setIsSettingsModalOpen(false); }}
        />
      )}
    </>
  );
};
