/**
 * debugHook
 * 自動動作確認（/verify）向けにゲーム状態を読み取り専用で公開するデバッグフックの本体
 * 状態の供給元（アプリフロー・ゲームシーン）を登録し，呼び出し時点のスナップショットを返す
 * 本番ビルドに含めないため，利用側は必ず import.meta.env.MODE !== "production" の分岐内から呼び出す
 */
import type { domain, GameResultPayload } from "@repo/shared";

/** window 上でデバッグフックを公開するプロパティ名（本番ビルド混入チェックの目印も兼ねる） */
export const DEBUG_HOOK_GLOBAL_KEY = "__PIXEL_PAINT_WAR_DEBUG__";

/** デバッグフックが返すスナップショット形式の版（形式を変えたら上げる） */
export const DEBUG_HOOK_SCHEMA_VERSION = 1;

/** ロビー参加者の公開情報 */
export type DebugRoomMemberState = {
  id: string;
  name: string;
  isOwner: boolean;
  preferredTeamId: number | null;
};

/** 参加中ルームの公開情報 */
export type DebugRoomState = {
  roomId: string;
  ownerId: string;
  status: domain.room.Room["status"];
  maxPlayers: number;
  targetPlayerCount: number | null;
  fieldSizePreset: domain.room.Room["fieldSizePreset"];
  teamAssignmentMode: domain.room.Room["teamAssignmentMode"];
  players: DebugRoomMemberState[];
};

/** アプリフロー（画面遷移・参加状態）の公開情報 */
export type DebugAppState = {
  scenePhase: domain.app.ScenePhaseType;
  myId: string | null;
  playerName: string;
  isJoining: boolean;
  isReconnecting: boolean;
  joinErrorMessage: string | null;
  connectionNoticeMessage: string | null;
  room: DebugRoomState | null;
  gameResult: GameResultPayload | null;
};

/** ローカルプレイヤーの公開情報（座標はグリッド単位） */
export type DebugLocalPlayerState = {
  id: string;
  teamId: number;
  x: number;
  y: number;
};

/** ゲームシーン（canvas 内の状態）の公開情報 */
export type DebugGameState = {
  remainingTimeSec: number;
  startCountdownSec: number;
  isInputEnabled: boolean;
  isBombEnabled: boolean;
  isFeverTime: boolean;
  /** teamId 順の塗り率（%） */
  teamPaintRates: number[];
  localBombHitCount: number;
  localPlayer: DebugLocalPlayerState | null;
  playerCount: number;
  /** 今回の試合時間（秒）．開発モードで server が上書きしていればその値 */
  gameDurationSec: number;
  gridCols: number;
  gridRows: number;
};

/** デバッグフックが返すスナップショット */
export type DebugSnapshot = {
  schemaVersion: number;
  capturedAtMs: number;
  app: DebugAppState | null;
  /** ゲームシーン表示中のみ値を持つ */
  game: DebugGameState | null;
};

/** 状態の供給元関数 */
export type DebugStateProvider<T> = () => T;

/** window へ公開する読み取り専用 API */
export type DebugHookApi = {
  readonly schemaVersion: number;
  readonly getSnapshot: () => DebugSnapshot;
};

/** 供給元の登録と取得を管理するレジストリ */
export type DebugStateRegistry = {
  /** アプリフローの供給元を登録し，登録解除関数を返す */
  setAppSource: (provider: DebugStateProvider<DebugAppState>) => () => void;
  /** ゲームシーンの供給元を登録し，登録解除関数を返す */
  setGameSource: (provider: DebugStateProvider<DebugGameState>) => () => void;
  /** 呼び出し時点のスナップショットを返す */
  getSnapshot: () => DebugSnapshot;
};

type DebugStateRegistryOptions = {
  nowMs?: () => number;
};

// 呼び出し側から内部状態を書き換えられないよう，JSON 化できる値の複製を返す
const cloneState = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

/** 供給元レジストリを生成する */
export const createDebugStateRegistry = ({
  nowMs = () => Date.now(),
}: DebugStateRegistryOptions = {}): DebugStateRegistry => {
  let appProvider: DebugStateProvider<DebugAppState> | null = null;
  let gameProvider: DebugStateProvider<DebugGameState> | null = null;

  // 自分が登録した供給元のときだけ解除し，後から登録された供給元を消さない
  const setAppSource = (provider: DebugStateProvider<DebugAppState>) => {
    appProvider = provider;
    return () => {
      if (appProvider === provider) {
        appProvider = null;
      }
    };
  };

  const setGameSource = (provider: DebugStateProvider<DebugGameState>) => {
    gameProvider = provider;
    return () => {
      if (gameProvider === provider) {
        gameProvider = null;
      }
    };
  };

  const getSnapshot = (): DebugSnapshot => {
    return {
      schemaVersion: DEBUG_HOOK_SCHEMA_VERSION,
      capturedAtMs: nowMs(),
      app: appProvider ? cloneState(appProvider()) : null,
      game: gameProvider ? cloneState(gameProvider()) : null,
    };
  };

  return { setAppSource, setGameSource, getSnapshot };
};

/** レジストリを読み取り専用 API として対象オブジェクトへ公開する */
export const installDebugHook = (
  target: object,
  registry: DebugStateRegistry,
): DebugHookApi => {
  const api: DebugHookApi = Object.freeze({
    schemaVersion: DEBUG_HOOK_SCHEMA_VERSION,
    getSnapshot: () => registry.getSnapshot(),
  });

  // 上書き・列挙を防ぎ，HMR 等の再公開だけは許す
  Object.defineProperty(target, DEBUG_HOOK_GLOBAL_KEY, {
    value: api,
    configurable: true,
    enumerable: false,
    writable: false,
  });

  return api;
};
