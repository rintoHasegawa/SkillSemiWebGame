/**
 * BombIdRegistry
 * 爆弾の requestId と tempBombId の採番と対応を管理する
 * ACK 反映時の ID 解決と後始末を一元管理する
 */
import { PendingBombRequestStore } from "./PendingBombRequestStore";

/** 爆弾の仮ID発行結果を表す型 */
export type IssuedPendingBombId = {
  requestId: string;
  tempBombId: string;
};

/** 爆弾ID関連の採番と対応管理を担うレジストリ */
export class BombIdRegistry {
  private pendingStore = new PendingBombRequestStore();
  private requestSerial = 0;

  /** 新しい requestId と tempBombId を発行して登録する */
  public issuePendingOwnBombId(): IssuedPendingBombId {
    const requestId = this.createRequestId();
    const tempBombId = this.createTempBombId(requestId);
    this.pendingStore.register(requestId, tempBombId);
    return { requestId, tempBombId };
  }

  /** requestId から tempBombId を解決する */
  public resolveTempBombIdByRequestId(requestId: string): string | undefined {
    return this.pendingStore.getTempBombIdByRequestId(requestId);
  }

  /** requestId 起点で pending 対応を削除する */
  public removeByRequestId(requestId: string): void {
    this.pendingStore.removeByRequestId(requestId);
  }

  /** bombId 起点で pending 対応を削除する */
  public removeByBombId(bombId: string): void {
    this.pendingStore.removeByTempBombId(bombId);
  }

  /** すべての pending 対応を削除する */
  public clear(): void {
    this.pendingStore.clear();
  }

  /** requestId を採番して文字列化する */
  private createRequestId(): string {
    this.requestSerial += 1;
    return `${this.requestSerial}`;
  }

  /** requestId から tempBombId を構築する */
  private createTempBombId(requestId: string): string {
    return `temp:${requestId}`;
  }
}
