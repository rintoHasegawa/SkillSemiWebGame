import type { PlayerDeadPayload } from "@repo/shared";

type PlayerDeathPolicyParams = {
  myId: string;
  lockInput: () => void;
};

/** 被弾後のローカルプレイヤー処理ポリシーを管理する */
export class PlayerDeathPolicy {
  private myId: string;
  private lockInput: () => void;

  constructor({ myId, lockInput }: PlayerDeathPolicyParams) {
    this.myId = myId;
    this.lockInput = lockInput;
  }

  /** サーバーからの死亡通知に応じてローカル被弾後処理を適用する */
  public applyPlayerDeadEvent(payload: PlayerDeadPayload): void {
    if (payload.playerId !== this.myId) {
      return;
    }

    this.lockInput();
  }
}
