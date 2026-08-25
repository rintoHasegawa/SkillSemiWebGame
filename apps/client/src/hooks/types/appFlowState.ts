/**
 * appFlowState
 * アプリフローの状態型とアクション型を定義する
 * 画面遷移とルーム同期の契約を集約する
 */
import { domain } from "@repo/shared";
import type { GameResultPayload } from "@repo/shared";

/** アプリフローの状態データ型 */
export type AppFlowData = {
  scenePhase: domain.app.ScenePhaseType;
  room: domain.room.Room | null;
  myId: string | null;
  gameResult: GameResultPayload | null;
  playerName: string;
  /** 予期しない接続断でセッションを破棄したか */
  isConnectionLost: boolean;
};

/** アプリフローを更新するアクション型 */
export type AppFlowAction =
  | { type: "connectionEstablished"; myId: string }
  | { type: "connectionLost" }
  | { type: "clearConnectionNotice" }
  | { type: "setPlayerName"; playerName: string }
  | { type: "setRoomAndLobby"; room: domain.room.Room }
  | { type: "updateRoom"; room: domain.room.Room }
  | { type: "setPlaying" }
  | { type: "setResult"; result: GameResultPayload }
  | { type: "resetToTitle"; clearMyId: boolean };
