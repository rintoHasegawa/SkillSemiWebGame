import { useEffect, useMemo, useState } from "react";
import { domain } from "@repo/shared";
import type { FieldSizePreset, StartGameRequestPayload, TeamAssignmentMode } from "@repo/shared";
import { config } from "@client/config";
import { socketManager } from "@client/network/SocketManager";
import { OVERLAY_BUTTON_STYLE } from "@client/scenes/shared/styles/overlayStyles";
import { GearIcon } from "./components/GearIcon";
import { LobbyRuleModal } from "./components/LobbyRuleModal";
import { LobbySettingsModal, toFieldPresetLabel } from "./components/LobbySettingsModal";
import { LobbyStartConfirmModal } from "./components/LobbyStartConfirmModal";
import {
  LOBBY_BACK_BUTTON_STYLE,
  LOBBY_BACKGROUND_STYLE,
  LOBBY_CONTAINER_STYLE,
  LOBBY_CONTROLS_BLOCK_STYLE,
  LOBBY_HOST_SETTINGS_LABEL_STYLE,
  LOBBY_HOST_SETTINGS_STYLE,
  LOBBY_HOST_SETTINGS_VALUE_STYLE,
  LOBBY_LABEL_STYLE,
  LOBBY_LEFT_INNER_STYLE,
  LOBBY_LEFT_PANEL_STYLE,
  LOBBY_PLAYER_LIST_HEADER_STYLE,
  LOBBY_PLAYER_LIST_ITEM_STYLE,
  LOBBY_PLAYER_LIST_PANEL_STYLE,
  LOBBY_SELECT_STYLE,
  LOBBY_SETTINGS_GEAR_BUTTON_STYLE,
  LOBBY_START_BUTTON_STYLE,
  LOBBY_TITLE_STYLE,
  LOBBY_WAITING_STYLE,
} from "./styles/LobbyScene.styles";

/** ホスト側で管理するゲーム設定 */
export type LobbyGameSettings = {
  targetPlayerCount: number;
  fieldSizePreset: FieldSizePreset;
  teamAssignmentMode: TeamAssignmentMode;
};

/** プレイヤーリストの並び順 */
type PlayerSortKey = "join" | "team" | "name";

const PLAYER_SORT_OPTIONS_BASE: Array<{ value: PlayerSortKey; label: string; teamOnly?: boolean }> = [
  { value: "join", label: "入った順" },
  { value: "team", label: "チーム順", teamOnly: true },
  { value: "name", label: "名前順" },
];

const TEAM_COLOR_LABELS = ["赤チーム", "青チーム", "緑チーム", "黄チーム"] as const;

/** チームIDを色名ラベルに変換する */
const toTeamLabel = (teamId: number): string => TEAM_COLOR_LABELS[teamId] ?? `チーム${teamId + 1}`;

/** チーム選択のオプション（チームID 0〜3 + ランダム） */
const TEAM_SELECT_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "ランダム" },
  { value: 0, label: toTeamLabel(0) },
  { value: 1, label: toTeamLabel(1) },
  { value: 2, label: toTeamLabel(2) },
  { value: 3, label: toTeamLabel(3) },
];

type TeamSelectFieldProps = {
  id: string;
  disabled: boolean;
  value: string;
  onChange: (preferredTeamId: number | null) => void;
  teamFullMessage: string | null;
};

/** チーム選択プルダウン（ランダムモード時はdisabled） */
const TeamSelectField = ({ id, disabled, value, onChange, teamFullMessage }: TeamSelectFieldProps) => (
  <div>
    <label htmlFor={id} style={LOBBY_LABEL_STYLE}>
      チームを選ぶ
    </label>
    <select
      id={id}
      disabled={disabled}
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? null : Number(val));
      }}
      style={{ ...LOBBY_SELECT_STYLE, marginTop: 6 }}
    >
      {TEAM_SELECT_OPTIONS.map(({ value: optVal, label }) => (
        <option key={String(optVal)} value={optVal === null ? "" : String(optVal)}>
          {label}
        </option>
      ))}
    </select>
    {teamFullMessage && (
      <div style={{ marginTop: 6, color: "#ff6b6b", fontSize: "0.9rem", fontWeight: 700 }}>
        {teamFullMessage}
      </div>
    )}
  </div>
);

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

  const [gameSettings, setGameSettings] = useState<LobbyGameSettings>({
    targetPlayerCount: minimumStartPlayerCount,
    fieldSizePreset: config.GAME_CONFIG.DEFAULT_FIELD_PRESET,
    teamAssignmentMode: "random",
  });
  const [teamFullMessage, setTeamFullMessage] = useState<string | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isStartConfirmVisible, setIsStartConfirmVisible] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [playerSortKey, setPlayerSortKey] = useState<PlayerSortKey>("join");

  const isPlayerSelect = room.teamAssignmentMode === "player_select";

  // チーム選択モードでないときは「チーム順」を選択肢から除外し，選択中ならリセットする
  const playerSortOptions = useMemo(
    () => PLAYER_SORT_OPTIONS_BASE.filter((o) => !o.teamOnly || isPlayerSelect),
    [isPlayerSelect],
  );
  useEffect(() => {
    if (!isPlayerSelect && playerSortKey === "team") {
      setPlayerSortKey("join");
    }
  }, [isPlayerSelect, playerSortKey]);

  // ソート済みプレイヤーリスト
  const sortedPlayers = useMemo(() => {
    if (playerSortKey === "join") return room.players;
    const sorted = [...room.players];
    if (playerSortKey === "team") {
      sorted.sort((a, b) => (a.preferredTeamId ?? Infinity) - (b.preferredTeamId ?? Infinity));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [room.players, playerSortKey]);

  useEffect(() => {
    setGameSettings((prev) => {
      const count = prev.targetPlayerCount;
      if (count < minimumStartPlayerCount || count > maxStartPlayerCount || count % teamUnit !== 0) {
        return { ...prev, targetPlayerCount: minimumStartPlayerCount };
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
      targetPlayerCount: gameSettings.targetPlayerCount,
      fieldSizePreset: gameSettings.fieldSizePreset,
      teamAssignmentMode: gameSettings.teamAssignmentMode,
    });
  }, [isMeOwner, gameSettings.targetPlayerCount, gameSettings.fieldSizePreset, gameSettings.teamAssignmentMode]);

  const handleStartClick = () => {
    setIsStartConfirmVisible(true);
  };

  const handleStartConfirm = () => {
    setIsStartConfirmVisible(false);
    onStart({
      targetPlayerCount: gameSettings.targetPlayerCount,
      fieldSizePreset: gameSettings.fieldSizePreset,
    });
  };

  const handleStartCancel = () => {
    setIsStartConfirmVisible(false);
  };

  useEffect(() => {
    const handler = () => {
      setTeamFullMessage("このチームは満員です。別のチームを選んでください。");
      setTimeout(() => { setTeamFullMessage(null); }, 3000);
    };
    socketManager.lobby.onSelectTeamRejected(handler);
    return () => { socketManager.lobby.offSelectTeamRejected(handler); };
  }, []);

  const handleSelectTeam = (preferredTeamId: number | null) => {
    socketManager.lobby.selectTeam({ preferredTeamId });
  };

  // 自分のチーム選択状態を取得する
  const myPreferredTeamId = room.players.find((p) => p.id === myId)?.preferredTeamId ?? null;

  // チーム割り当て方式のラベルを取得する
  const teamAssignmentModeLabel =
    room.teamAssignmentMode === "player_select" ? "プレイヤーが選択" : "ランダム";

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

                  <TeamSelectField
                    id="team-select-owner"
                    disabled={!isPlayerSelect}
                    value={isPlayerSelect && myPreferredTeamId !== null ? String(myPreferredTeamId) : ""}
                    onChange={handleSelectTeam}
                    teamFullMessage={teamFullMessage}
                  />
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
                    <div>
                      <div style={LOBBY_HOST_SETTINGS_LABEL_STYLE}>チームの決め方</div>
                      <div style={LOBBY_HOST_SETTINGS_VALUE_STYLE}>
                        {teamAssignmentModeLabel}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setIsRuleModalOpen(true); }}
                    style={{ ...OVERLAY_BUTTON_STYLE, width: "100%" }}
                  >
                    ルールを見る
                  </button>

                  <TeamSelectField
                    id="team-select-member"
                    disabled={!isPlayerSelect}
                    value={isPlayerSelect && myPreferredTeamId !== null ? String(myPreferredTeamId) : ""}
                    onChange={handleSelectTeam}
                    teamFullMessage={teamFullMessage}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 右半分: 参加プレイヤーリスト */}
          <div style={LOBBY_PLAYER_LIST_PANEL_STYLE}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #555", paddingBottom: "10px", marginBottom: "10px" }}>
              <h3 style={{ ...LOBBY_PLAYER_LIST_HEADER_STYLE, border: "none", padding: 0, margin: 0 }}>
                参加プレイヤー ({room.players.length}/{room.maxPlayers})
              </h3>
              <select
                value={playerSortKey}
                onChange={(e) => { setPlayerSortKey(e.target.value as PlayerSortKey); }}
                style={{ ...LOBBY_SELECT_STYLE, width: "auto", padding: "4px 8px", fontSize: "0.85rem" }}
              >
                {playerSortOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <ul className="lobby-player-list">
              {sortedPlayers.map((p: domain.room.RoomMember) => (
                <li key={p.id} style={LOBBY_PLAYER_LIST_ITEM_STYLE}>
                  <span>{p.id === myId ? "🟢" : "⚪"}</span>
                  <span style={{
                    fontWeight: p.id === myId ? "bold" : "normal",
                    color: isPlayerSelect && p.preferredTeamId !== null
                      ? config.GAME_CONFIG.TEAM_COLORS[p.preferredTeamId]
                      : undefined,
                  }}>
                    {p.name}
                  </span>
                  {p.isOwner && <span style={{ fontSize: "0.9em" }}>👑</span>}
                  {isPlayerSelect && (
                    <span style={{
                      marginLeft: "auto",
                      fontSize: "0.85em",
                      opacity: 0.8,
                      color: p.preferredTeamId !== null
                        ? config.GAME_CONFIG.TEAM_COLORS[p.preferredTeamId]
                        : undefined,
                    }}>
                      {p.preferredTeamId !== null ? toTeamLabel(p.preferredTeamId) : "ランダム"}
                    </span>
                  )}
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
          settings={gameSettings}
          onChangeSettings={setGameSettings}
          onClose={() => { setIsSettingsModalOpen(false); }}
        />
      )}
    </>
  );
};
