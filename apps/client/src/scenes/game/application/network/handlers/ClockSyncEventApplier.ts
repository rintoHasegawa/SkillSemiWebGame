/**
 * ClockSyncEventApplier
 * 時刻同期関連イベントの反映を担当する
 * ゲーム開始時刻同期とPONG処理を専用化する
 */
import type { GameStartPayload, PongPayload } from "@repo/shared";
import { toGameStartElapsedMs } from "@client/scenes/game/application/network/adapters/GameNetworkEventAdapter";

/** 時刻同期イベント反映の初期化入力 */
export type ClockSyncEventApplierOptions = {
  onGameStarted: (serverElapsedMs: number) => void;
  onGameStartClockHint: (serverElapsedMs: number) => void;
  onPongReceived: (payload: PongPayload) => void;
  onDebugLog?: (message: string) => void;
};

/** 時刻同期イベントの状態反映を担当する */
export class ClockSyncEventApplier {
  private readonly onGameStarted: (serverElapsedMs: number) => void;
  private readonly onGameStartClockHint: (serverElapsedMs: number) => void;
  private readonly onPongReceived: (payload: PongPayload) => void;
  private readonly onDebugLog: (message: string) => void;

  constructor({
    onGameStarted,
    onGameStartClockHint,
    onPongReceived,
    onDebugLog,
  }: ClockSyncEventApplierOptions) {
    this.onGameStarted = onGameStarted;
    this.onGameStartClockHint = onGameStartClockHint;
    this.onPongReceived = onPongReceived;
    this.onDebugLog = onDebugLog ?? (() => undefined);
  }

  /** GAME_STARTイベントを反映する */
  public applyGameStart(payload: GameStartPayload): void {
    // 壊れたペイロードで時計補正だけ適用されないよう，検証を先に行う
    const serverElapsedMs = toGameStartElapsedMs(payload);
    if (serverElapsedMs === null) {
      console.error(
        "[ClockSyncEventApplier] GAME_STARTのサーバー経過時間が不正なため無視する",
      );
      return;
    }

    // 検証済みの経過msのみで時計補正と開始通知を行う
    this.onGameStartClockHint(serverElapsedMs);
    this.onGameStarted(serverElapsedMs);
    this.onDebugLog(
      `[GameNetworkSync] ゲーム経過時間同期完了: ${serverElapsedMs}`,
    );
  }

  /** PONGイベントを反映する */
  public applyPong(payload: PongPayload): void {
    this.onPongReceived(payload);
  }
}
