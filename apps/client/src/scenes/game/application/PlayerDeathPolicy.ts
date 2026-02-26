import type { PlayerDeadPayload } from "@repo/shared";

type PlayerDeathPolicyParams = {
  myId: string;
  hitStunMs: number;
  acquireInputLock: () => () => void;
};

/** 被弾後のローカルプレイヤー処理ポリシーを管理する */
export class PlayerDeathPolicy {
  private myId: string;
  private hitStunMs: number;
  private acquireInputLock: () => () => void;
  private activeLockRelease: (() => void) | null = null;
  private unlockTimer: ReturnType<typeof setTimeout> | null = null;

  constructor({ myId, hitStunMs, acquireInputLock }: PlayerDeathPolicyParams) {
    this.myId = myId;
    this.hitStunMs = hitStunMs;
    this.acquireInputLock = acquireInputLock;
  }

  /** サーバーからの死亡通知に応じてローカル被弾後処理を適用する */
  public applyPlayerDeadEvent(payload: PlayerDeadPayload): void {
    if (payload.playerId !== this.myId) {
      return;
    }

    this.applyHitStun();
  }

  /** ローカル被弾判定時に硬直を適用する */
  public applyLocalHitStun(): void {
    this.applyHitStun();
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

  private applyHitStun(): void {
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
    }, this.hitStunMs);
  }
}
