/**
 * BotHitStunPolicy
 * Bot被弾硬直時間の判定と更新時刻計算を提供する
 */

/** Bot被弾硬直ポリシーの初期化入力 */
export type BotHitStunPolicyParams = {
  hitStunMs: number;
};

/** Bot被弾硬直の判定と次回硬直終了時刻計算を提供する */
export class BotHitStunPolicy {
  private readonly hitStunMs: number;

  constructor({ hitStunMs }: BotHitStunPolicyParams) {
    this.hitStunMs = hitStunMs;
  }

  /** 現在時刻と硬直終了時刻から硬直中かどうかを判定する */
  public isStunned(nowMs: number, stunUntilMs: number): boolean {
    return nowMs < stunUntilMs;
  }

  /** 現在の硬直終了時刻と被弾時刻から次回硬直終了時刻を計算する */
  public calculateNextStunUntilMs(currentStunUntilMs: number, nowMs: number): number {
    const candidateStunUntilMs = nowMs + this.hitStunMs;
    return Math.max(currentStunUntilMs, candidateStunUntilMs);
  }
}
