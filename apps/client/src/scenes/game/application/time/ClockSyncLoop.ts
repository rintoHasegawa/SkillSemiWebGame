/**
 * ClockSyncLoop
 * 時刻同期PING送信の定期実行を管理する
 * 可変間隔スケジュールと停止処理を一元化する
 */
import { SYSTEM_TIME_PROVIDER } from "./TimeProvider";

/** 時刻同期ループ初期化入力型 */
export type ClockSyncLoopOptions = {
  sendPing: (clientTime: number) => void;
  getNextIntervalMs: () => number;
  nowMsProvider?: () => number;
};

/** 時刻同期PING送信の開始停止を管理する */
export class ClockSyncLoop {
  private readonly sendPing: (clientTime: number) => void;
  private readonly getNextIntervalMs: () => number;
  private readonly nowMsProvider: () => number;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor({
    sendPing,
    getNextIntervalMs,
    nowMsProvider = SYSTEM_TIME_PROVIDER.now,
  }: ClockSyncLoopOptions) {
    this.sendPing = sendPing;
    this.getNextIntervalMs = getNextIntervalMs;
    this.nowMsProvider = nowMsProvider;
  }

  /** 同期ループを開始する */
  public start(): void {
    this.stop();
    this.executeOnce();
  }

  /** 同期ループを停止する */
  public stop(): void {
    if (this.timeoutId === null) {
      return;
    }

    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  /** 同期ループを停止して破棄する */
  public dispose(): void {
    this.stop();
  }

  /** 現在ループが動作中かを返す */
  public isRunning(): boolean {
    return this.timeoutId !== null;
  }

  private executeOnce(): void {
    this.sendPing(this.nowMsProvider());

    const intervalMs = this.getNextIntervalMs();
    this.timeoutId = setTimeout(() => {
      this.executeOnce();
    }, intervalMs);
  }
}
