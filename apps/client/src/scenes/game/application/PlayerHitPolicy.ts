import type { PlayerHitPayload } from "@repo/shared";

type PlayerHitPolicyParams = {
  myId: string;
  hitStunMs: number;
  acquireInputLock: () => () => void;
};

/** 被弾後のローカルプレイヤー処理ポリシーを管理する */
export class PlayerHitPolicy {
  private myId: string;
  private hitStunMs: number;
  private acquireInputLock: () => () => void;
  private activeLockRelease: (() => void) | null = null;
  private unlockTimer: ReturnType<typeof setTimeout> | null = null;

  constructor({ myId, hitStunMs, acquireInputLock }: PlayerHitPolicyParams) {
    this.myId = myId;
    this.hitStunMs = hitStunMs;
    this.acquireInputLock = acquireInputLock;
  }

  /** サーバーからの被弾通知に応じてローカル被弾後処理を適用する */
  public applyPlayerHitEvent(payload: PlayerHitPayload): void {
    if (payload.playerId !== this.myId) {
      return;
    }

    this.applyHitStun();
  }

  /** ローカル被弾判定時に硬直を適用する */
  public applyLocalHitStun(durationMs?: number): void {
    this.applyHitStun(durationMs);
  }

  /** ポリシーが保持するタイマーと入力ロックを解放する */
  public dispose(): void {
    if (this.unlockTimer) {
      clearTimeout(this.unlockTimer);
      this.unlockTimer = null;
    }

    if (this.activeLockRelease) {
      this.activeLockRelease();
      this.activeLockRelease = null;
    }
  }

  private applyHitStun(durationMs = this.hitStunMs): void {
    if (!this.activeLockRelease) {
      this.activeLockRelease = this.acquireInputLock();
    }

    if (this.unlockTimer) {
      clearTimeout(this.unlockTimer);
      this.unlockTimer = null;
    }

    this.unlockTimer = setTimeout(() => {
      this.unlockTimer = null;
      if (this.activeLockRelease) {
        this.activeLockRelease();
        this.activeLockRelease = null;
      }
    }, durationMs);
  }
}
