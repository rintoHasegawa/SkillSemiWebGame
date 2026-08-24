/**
 * ClockOffsetTracker
 * クライアント単調時計からサーバーのゲーム経過msへのoffsetを推定し追従する
 * 直近サンプル窓の最小RTTサンプルを推定値に採り，現在値をslewで寄せる
 */
import type { PongSample } from "./PongSampleEstimator";

/** offset推定と追従の設定値 */
export type ClockOffsetTrackerConfig = {
  /** 最小RTT探索に使う直近サンプル数 */
  sampleWindowSize: number;
  /** 1サンプルあたりに動かせるoffsetの上限ms */
  maxSlewPerSampleMs: number;
  /** RTT平滑化のEWMA係数 */
  rttAlpha: number;
};

/** offset推定と追従の既定設定 */
export const DEFAULT_CLOCK_OFFSET_TRACKER_CONFIG: ClockOffsetTrackerConfig = {
  sampleWindowSize: 8,
  maxSlewPerSampleMs: 50,
  rttAlpha: 0.25,
};

/** 最小RTTサンプルによるoffset推定とslew追従の状態を保持する */
export class ClockOffsetTracker {
  private readonly config: ClockOffsetTrackerConfig;
  // 実測サンプル専用のリングバッファ．seedは混ぜない
  private readonly sampleWindow: PongSample[] = [];
  private nextWriteIndex = 0;
  private currentOffsetMs: number | null = null;
  // 窓が空の間だけ使う初期表示用のoffset（片道遅延ぶん過小）
  private seedOffsetMs: number | null = null;
  private smoothedRttMs: number | null = null;

  constructor(config: Partial<ClockOffsetTrackerConfig> = {}) {
    this.config = {
      ...DEFAULT_CLOCK_OFFSET_TRACKER_CONFIG,
      ...config,
    };

    this.assertValidConfig();
  }

  /** サーバーのゲーム経過msからoffset初期値を設定する */
  public seed(serverElapsedMs: number, receivedAtMs: number): void {
    // 実測サンプル取り込み済みの場合は，片道遅延を含む暫定値で推定結果を汚さない
    if (this.sampleWindow.length > 0) {
      return;
    }

    this.seedOffsetMs = serverElapsedMs - receivedAtMs;
  }

  /** 推定サンプルを取り込みoffsetとRTTを更新する */
  public applySample(sample: PongSample): void {
    // 同期間隔の判定は最良ケースではなく典型的な回線品質を見たいので，RTTはEWMAのまま扱う
    this.smoothedRttMs = this.smoothRttMs(sample.rttMs);
    this.pushSample(sample);

    // キューイング遅延が最も小さいサンプルは片道遅延=RTT/2の仮定が最も成立する
    const targetOffsetMs = this.selectTargetOffsetMs(sample);

    // 試合開始時に一気に合わせる必要があるため，最初の推定値はslewせず即座に採用する
    if (this.currentOffsetMs === null) {
      this.currentOffsetMs = targetOffsetMs;
      return;
    }

    this.currentOffsetMs = this.slewTowards(
      this.currentOffsetMs,
      targetOffsetMs,
    );
  }

  /** 現在のoffsetを返す */
  public getClockOffsetMs(): number {
    return this.currentOffsetMs ?? this.seedOffsetMs ?? 0;
  }

  /** RTT平滑化済みの値を返す */
  public getSmoothedRttMs(): number | null {
    return this.smoothedRttMs;
  }

  /** offsetを一度でも取得済みかを返す */
  public hasOffsetEstimate(): boolean {
    return this.currentOffsetMs !== null || this.seedOffsetMs !== null;
  }

  /** 内部状態を初期化する */
  public reset(): void {
    this.sampleWindow.length = 0;
    this.nextWriteIndex = 0;
    this.currentOffsetMs = null;
    this.seedOffsetMs = null;
    this.smoothedRttMs = null;
  }

  // 設定値の不整合は推定を無効化するプログラマエラーなので即座に落とす
  private assertValidConfig(): void {
    const { sampleWindowSize, maxSlewPerSampleMs, rttAlpha } = this.config;

    // 1未満・非整数の窓幅はリングバッファとして成立しない
    if (!Number.isInteger(sampleWindowSize) || sampleWindowSize < 1) {
      throw new Error(
        `Invalid sampleWindowSize: ${sampleWindowSize} (must be an integer >= 1)`,
      );
    }

    // 0以下だと推定値へ永久に追従できず，非有限だと制限が無意味になる
    if (!Number.isFinite(maxSlewPerSampleMs) || maxSlewPerSampleMs <= 0) {
      throw new Error(
        `Invalid maxSlewPerSampleMs: ${maxSlewPerSampleMs} (must be a finite number > 0)`,
      );
    }

    // EWMA係数は0超1以下でなければ平滑化として成立しない
    if (!(rttAlpha > 0) || rttAlpha > 1) {
      throw new Error(`Invalid rttAlpha: ${rttAlpha} (must be > 0 and <= 1)`);
    }
  }

  // 最古のサンプルを上書きして直近N件だけを保持する
  private pushSample(sample: PongSample): void {
    if (this.sampleWindow.length < this.config.sampleWindowSize) {
      this.sampleWindow.push(sample);
      return;
    }

    this.sampleWindow[this.nextWriteIndex] = sample;
    this.nextWriteIndex =
      (this.nextWriteIndex + 1) % this.config.sampleWindowSize;
  }

  // 窓の中でRTTが最小のサンプルのoffsetを推定値として返す
  // 窓は上書き式で時系列順ではないため，同RTTのとき最新を採るには最新サンプルを初期候補に置く
  private selectTargetOffsetMs(latestSample: PongSample): number {
    let minRttSample = latestSample;
    for (const sample of this.sampleWindow) {
      if (sample.rttMs < minRttSample.rttMs) {
        minRttSample = sample;
      }
    }

    return minRttSample.offsetMs;
  }

  // 1サンプルあたりの移動量を制限しつつ推定値へ寄せる
  private slewTowards(currentMs: number, targetOffsetMs: number): number {
    const deltaMs = targetOffsetMs - currentMs;
    const maxSlewMs = this.config.maxSlewPerSampleMs;
    if (Math.abs(deltaMs) <= maxSlewMs) {
      return targetOffsetMs;
    }

    return currentMs + Math.sign(deltaMs) * maxSlewMs;
  }

  private smoothRttMs(measuredRttMs: number): number {
    if (this.smoothedRttMs === null) {
      return measuredRttMs;
    }

    const alpha = this.config.rttAlpha;
    return this.smoothedRttMs * (1 - alpha) + measuredRttMs * alpha;
  }
}
