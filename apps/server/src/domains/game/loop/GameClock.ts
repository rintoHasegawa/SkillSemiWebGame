/**
 * GameClock
 * 試合の経過時間を単調時計で提供する，唯一のゲーム時間軸
 * 原点は start() 呼び出し時に確定し，開始待機（カウントダウン）ぶんは
 * getElapsedMs() 側でオフセットして吸収する
 */

/** 単調時計の現在値（ms）を返す関数の契約 */
export type NowProvider = () => number;

// 非有限・負の待機時間は原点計算を壊すため 0 に丸める
const normalizeStartDelayMs = (startDelayMs: number): number => {
  return Number.isFinite(startDelayMs) ? Math.max(0, startDelayMs) : 0;
};

/** 試合の経過時間を単調時計で提供するゲーム時間軸 */
export class GameClock {
  private readonly startDelayMs: number;
  private readonly nowProvider: NowProvider;
  // 0 も有効な原点のため未開始判定は undefined で行う
  private originMs: number | undefined = undefined;

  constructor(
    startDelayMs: number,
    nowProvider: NowProvider = () => performance.now(),
  ) {
    this.startDelayMs = normalizeStartDelayMs(startDelayMs);
    this.nowProvider = nowProvider;
  }

  /**
   * 開始待機（カウントダウン）時間を返す
   * ループ側の初回tick・終了判定も同じ値を参照し，待機時間の二重管理を防ぐ
   */
  public getStartDelayMs(): number {
    return this.startDelayMs;
  }

  /** 原点を確定する，確定済みの場合は何もしない */
  public start(): void {
    if (this.originMs !== undefined) {
      return;
    }

    this.originMs = this.nowProvider();
  }

  /** 原点からの経過ms（tickスケジュール用），未開始時は 0 を返す */
  public getRawElapsedMs(): number {
    if (this.originMs === undefined) {
      return 0;
    }

    return Math.max(0, this.nowProvider() - this.originMs);
  }

  /** ゲームプレイ開始からの経過ms，カウントダウン中・未開始時は 0 を返す */
  public getElapsedMs(): number {
    return Math.max(0, this.getSignedElapsedMs());
  }

  /**
   * ゲームプレイ開始からの符号付き経過ms，カウントダウン中・未開始時は負値を返す
   * クライアントへ配信する唯一の時間表現として使う
   */
  public getSignedElapsedMs(): number {
    return this.getRawElapsedMs() - this.startDelayMs;
  }

  /** ゲームプレイが開始済みか，カウントダウン中・未開始時は false を返す */
  public hasGameplayStarted(): boolean {
    if (this.originMs === undefined) {
      return false;
    }

    return this.getRawElapsedMs() >= this.startDelayMs;
  }
}
