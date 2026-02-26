/**
 * PendingBombRequestStore
 * 爆弾設置要求の requestId と tempBombId の対応を管理する
 * ACK 到着時の置換処理で参照する対応表を一元管理する
 */

/** 爆弾設置の pending 対応表を管理するストア */
export class PendingBombRequestStore {
  private pendingOwnRequestToTempBombId = new Map<string, string>();
  private pendingTempBombIdToOwnRequest = new Map<string, string>();

  /** requestId と tempBombId の対応を登録する */
  public register(requestId: string, tempBombId: string): void {
    this.pendingOwnRequestToTempBombId.set(requestId, tempBombId);
    this.pendingTempBombIdToOwnRequest.set(tempBombId, requestId);
  }

  /** requestId に対応する tempBombId を取得する */
  public getTempBombIdByRequestId(requestId: string): string | undefined {
    return this.pendingOwnRequestToTempBombId.get(requestId);
  }

  /** requestId 起点で対応を削除する */
  public removeByRequestId(requestId: string): void {
    const tempBombId = this.pendingOwnRequestToTempBombId.get(requestId);
    if (!tempBombId) {
      return;
    }

    this.pendingOwnRequestToTempBombId.delete(requestId);
    this.pendingTempBombIdToOwnRequest.delete(tempBombId);
  }

  /** tempBombId 起点で対応を削除する */
  public removeByTempBombId(tempBombId: string): void {
    const requestId = this.pendingTempBombIdToOwnRequest.get(tempBombId);
    if (!requestId) {
      return;
    }

    this.pendingTempBombIdToOwnRequest.delete(tempBombId);
    this.pendingOwnRequestToTempBombId.delete(requestId);
  }

  /** すべての pending 対応を削除する */
  public clear(): void {
    this.pendingOwnRequestToTempBombId.clear();
    this.pendingTempBombIdToOwnRequest.clear();
  }
}
