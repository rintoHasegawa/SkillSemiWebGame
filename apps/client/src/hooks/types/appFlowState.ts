/**
 * appFlowState
 * アプリフローの状態型とアクション型を定義する
 * 画面遷移とルーム同期の契約を集約する
 */
import { domain } from "@repo/shared";
import type { GameResultPayload, ResumeSessionRejectedPayload } from "@repo/shared";

/** タイトルへ戻した理由をユーザーへ伝える通知種別 */
export type ConnectionNoticeType = "disconnected" | "game_ended";

/** アプリフローの状態データ型 */
export type AppFlowData = {
  scenePhase: domain.app.ScenePhaseType;
  room: domain.room.Room | null;
  myId: string | null;
  gameResult: GameResultPayload | null;
  playerName: string;
  /** セッションを破棄してタイトルへ戻した理由（通知不要は null） */
  connectionNotice: ConnectionNoticeType | null;
  /** プレイ中の切断から席へ復帰しようとしている最中か */
  isReconnecting: boolean;
  /** サーバとのプロトコル版が一致せず接続を拒否されたか */
  isProtocolMismatch: boolean;
};

/** アプリフローを更新するアクション型 */
export type AppFlowAction =
  | { type: "connectionEstablished"; myId: string }
  | { type: "connectionLost" }
  | { type: "clearConnectionNotice" }
  | { type: "protocolVersionMismatch" }
  | { type: "setPlayerName"; playerName: string }
  | { type: "setRoomAndLobby"; room: domain.room.Room }
  | { type: "updateRoom"; room: domain.room.Room }
  | { type: "setPlaying" }
  | { type: "setResult"; result: GameResultPayload }
  | { type: "sessionResumed"; playerId: string; room: domain.room.Room }
  | { type: "resumeRejected"; reason: ResumeSessionRejectedPayload["reason"] }
  | { type: "resetToTitle"; clearMyId: boolean };
