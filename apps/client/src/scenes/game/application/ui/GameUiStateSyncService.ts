/**
 * GameUiStateSyncService
 * ゲーム画面向けUI状態の購読と差分通知を管理する
 * 秒境界に揃えた定期通知と購読解除を提供する
 */
import {
  SYSTEM_TIME_PROVIDER,
  type TimeProvider,
} from "@client/scenes/game/application/time/TimeProvider";

const UI_STATE_SECOND_MS = 1000;

/** ゲーム画面UIへ通知する状態スナップショット */
export type GameHudState = {
  remainingTimeSec: number;
  startCountdownSec: number;
  isInputEnabled: boolean;
  teamPaintRates: number[];
  localBombHitCount: number;
};

/** ミニマップへ通知する状態スナップショット */
export type MiniMapState = {
  mapRevision: number;
  teamIds: number[];
  localPlayerPosition: { x: number; y: number } | null;
};

/** ゲーム画面UIへ通知する状態スナップショット */
export type GameUiState = {
  hud: GameHudState;
  miniMap: MiniMapState;
};

const isSameLocalPlayerPosition = (
  a: { x: number; y: number } | null,
  b: { x: number; y: number } | null,
): boolean => {
  if (a === null && b === null) {
    return true;
  }

  if (a === null || b === null) {
    return false;
  }

  return a.x === b.x && a.y === b.y;
};

const isSamePaintRates = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (Math.abs(a[index] - b[index]) > 0.01) {
      return false;
    }
  }

  return true;
};

type GameUiStateSyncServiceOptions = {
  getSnapshot: () => GameUiState;
  timeProvider?: TimeProvider;
};

/** UI状態の購読と定期通知を管理するサービス */
export class GameUiStateSyncService {
  private readonly getSnapshot: () => GameUiState;
  private readonly timeProvider: TimeProvider;
  private readonly listeners = new Set<(state: GameUiState) => void>();
  private lastState: GameUiState | null = null;
  private alignTimeoutId: number | null = null;
  private timerId: number | null = null;

  constructor({ getSnapshot, timeProvider }: GameUiStateSyncServiceOptions) {
    this.getSnapshot = getSnapshot;
    this.timeProvider = timeProvider ?? SYSTEM_TIME_PROVIDER;
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
      !force &&
      this.lastState &&
      this.lastState.hud.remainingTimeSec === snapshot.hud.remainingTimeSec &&
      this.lastState.hud.startCountdownSec === snapshot.hud.startCountdownSec &&
      this.lastState.hud.isInputEnabled === snapshot.hud.isInputEnabled &&
      this.lastState.hud.localBombHitCount === snapshot.hud.localBombHitCount &&
      isSamePaintRates(
        this.lastState.hud.teamPaintRates,
        snapshot.hud.teamPaintRates,
      ) &&
      this.lastState.miniMap.mapRevision === snapshot.miniMap.mapRevision &&
      isSameLocalPlayerPosition(
        this.lastState.miniMap.localPlayerPosition,
        snapshot.miniMap.localPlayerPosition,
      )
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

    const nowMs = this.timeProvider.now();
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
