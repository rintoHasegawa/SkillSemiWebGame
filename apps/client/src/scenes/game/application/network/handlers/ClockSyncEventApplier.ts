/**
 * ClockSyncEventApplier
 * 時刻同期関連イベントの反映を担当する
 * ゲーム開始時刻同期とPONG処理を専用化する
 */
import type { GameStartPayload, PongPayload } from "@repo/shared";
import { toGameStartedAt } from "@client/scenes/game/application/network/adapters/GameNetworkEventAdapter";

/** 時刻同期イベント反映の初期化入力 */
export type ClockSyncEventApplierOptions = {
  onGameStarted: (startTime: number) => void;
  onGameStartClockHint: (serverNowMs: number) => void;
  onPongReceived: (payload: PongPayload) => void;
  onDebugLog?: (message: string) => void;
};

/** 時刻同期イベントの状態反映を担当する */
export class ClockSyncEventApplier {
  private readonly onGameStarted: (startTime: number) => void;
  private readonly onGameStartClockHint: (serverNowMs: number) => void;
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
    const startTime = toGameStartedAt(payload);
    if (startTime === null) {
      console.error(
        "[ClockSyncEventApplier] GAME_STARTの開始時刻が不正なため無視する",
      );
      return;
    }

    // serverNow が数値でない場合は時計補正を汚さないよう補正のみ見送る
    if (Number.isFinite(payload.serverNow)) {
      this.onGameStartClockHint(payload.serverNow);
    } else {
      console.error(
        "[ClockSyncEventApplier] GAME_STARTのサーバー時刻が不正なため時計補正を適用しない",
      );
    }

    this.onGameStarted(startTime);
    this.onDebugLog(`[GameNetworkSync] ゲーム開始時刻同期完了: ${startTime}`);
  }

  /** PONGイベントを反映する */
  public applyPong(payload: PongPayload): void {
    this.onPongReceived(payload);
  }
}
