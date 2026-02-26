/**
 * GameUiStateSyncService
 * ゲーム画面向けUI状態の購読と差分通知を管理する
 * 秒境界に揃えた定期通知と購読解除を提供する
 */
const UI_STATE_SECOND_MS = 1000;

/** ゲーム画面UIへ通知する状態スナップショット */
export type GameUiState = {
  remainingTimeSec: number;
  startCountdownSec: number;
  isInputEnabled: boolean;
};

type GameUiStateSyncServiceOptions = {
  getSnapshot: () => GameUiState;
};

/** UI状態の購読と定期通知を管理するサービス */
export class GameUiStateSyncService {
  private readonly getSnapshot: () => GameUiState;
  private readonly listeners = new Set<(state: GameUiState) => void>();
  private lastState: GameUiState | null = null;
  private alignTimeoutId: number | null = null;
  private timerId: number | null = null;

  constructor({ getSnapshot }: GameUiStateSyncServiceOptions) {
    this.getSnapshot = getSnapshot;
  }

  public subscribe(listener: (state: GameUiState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  public emitIfChanged(force = false): void {
    if (this.listeners.size === 0 && !force) {
      return;
    }

    const snapshot = this.getSnapshot();
    if (
      !force
      && this.lastState
      && this.lastState.remainingTimeSec === snapshot.remainingTimeSec
      && this.lastState.startCountdownSec === snapshot.startCountdownSec
      && this.lastState.isInputEnabled === snapshot.isInputEnabled
    ) {
      return;
    }

    this.lastState = snapshot;
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  public startTicker(): void {
    if (this.alignTimeoutId !== null || this.timerId !== null) {
      return;
    }

    const nowMs = Date.now();
    const delayToNextSecond = UI_STATE_SECOND_MS - (nowMs % UI_STATE_SECOND_MS);

    this.alignTimeoutId = window.setTimeout(() => {
      this.alignTimeoutId = null;
      this.emitIfChanged();
      this.timerId = window.setInterval(() => {
        this.emitIfChanged();
      }, UI_STATE_SECOND_MS);
    }, delayToNextSecond);
  }

  public stopTicker(): void {
    if (this.alignTimeoutId !== null) {
      window.clearTimeout(this.alignTimeoutId);
      this.alignTimeoutId = null;
    }

    if (this.timerId === null) {
      return;
    }

    window.clearInterval(this.timerId);
    this.timerId = null;
  }

  public clear(): void {
    this.listeners.clear();
    this.lastState = null;
  }
}