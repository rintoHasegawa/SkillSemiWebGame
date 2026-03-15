/**
 * ClockSyncService
 * サーバー時刻との差分を平滑化して管理する
 * PING/PONGのRTTを使い，外れ値を除外して同期精度を安定化する
 */
import type { PongPayload } from "@repo/shared";

/** 時刻同期に利用する更新パラメータ */
export type ClockSyncConfig = {
  offsetAlpha: number;
  rttAlpha: number;
  maxAcceptedRttMs: number;
  maxAcceptedOffsetJumpMs: number;
};

/** 時刻同期の既定パラメータ */
export const DEFAULT_CLOCK_SYNC_CONFIG: ClockSyncConfig = {
  offsetAlpha: 0.12,
  rttAlpha: 0.25,
  maxAcceptedRttMs: 1000,
  maxAcceptedOffsetJumpMs: 250,
};

/** サーバー時刻との差分を平滑化して保持する */
export class ClockSyncService {
  private readonly config: ClockSyncConfig;
  private smoothedOffsetMs: number | null = null;
  private smoothedRttMs: number | null = null;

  constructor(config: Partial<ClockSyncConfig> = {}) {
    this.config = {
      ...DEFAULT_CLOCK_SYNC_CONFIG,
      ...config,
    };
  }

  /** 受信した serverNow をもとに差分を初期化する */
  public seedFromServerNow(serverNowMs: number, receivedAtMs = Date.now()): void {
    this.smoothedOffsetMs = serverNowMs - receivedAtMs;
  }

  /** PONGサンプルを取り込み，差分とRTTを更新する */
  public updateFromPong(payload: PongPayload, receivedAtMs = Date.now()): void {
    const measuredRttMs = receivedAtMs - payload.clientTime;
    if (measuredRttMs < 0 || measuredRttMs > this.config.maxAcceptedRttMs) {
      return;
    }

    const estimatedOneWayMs = measuredRttMs / 2;
    const measuredOffsetMs =
      payload.serverTime - (payload.clientTime + estimatedOneWayMs);

    this.smoothedRttMs = this.smoothValue(
      this.smoothedRttMs,
      measuredRttMs,
      this.config.rttAlpha,
    );

    if (
      this.smoothedOffsetMs !== null &&
      Math.abs(measuredOffsetMs - this.smoothedOffsetMs) >
        this.config.maxAcceptedOffsetJumpMs
    ) {
      return;
    }

    this.smoothedOffsetMs = this.smoothValue(
      this.smoothedOffsetMs,
      measuredOffsetMs,
      this.config.offsetAlpha,
    );
  }

  /** 平滑化済みの時刻差分ミリ秒を返す */
  public getClockOffsetMs(): number {
    return this.smoothedOffsetMs ?? 0;
  }

  /** サーバー時刻基準へ補正した現在時刻ミリ秒を返す */
  public getSynchronizedNowMs(): number {
    return Date.now() + this.getClockOffsetMs();
  }

  /** RTT状況に応じた次回同期推奨間隔ミリ秒を返す */
  public getRecommendedSyncIntervalMs(): number {
    if (this.smoothedRttMs === null) {
      return 3000;
    }

    if (this.smoothedRttMs <= 80) {
      return 5000;
    }

    if (this.smoothedRttMs <= 180) {
      return 3000;
    }

    return 2000;
  }

  /** 内部状態を初期化する */
  public reset(): void {
    this.smoothedOffsetMs = null;
    this.smoothedRttMs = null;
  }

  private smoothValue(
    current: number | null,
    measured: number,
    alpha: number,
  ): number {
    if (current === null) {
      return measured;
    }

    return current * (1 - alpha) + measured * alpha;
  }
}
