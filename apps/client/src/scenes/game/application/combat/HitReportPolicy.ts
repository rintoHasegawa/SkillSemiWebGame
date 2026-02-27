/**
 * HitReportPolicy
 * 爆弾被弾報告の送信可否を判定するポリシー
 * 同一爆弾IDの重複送信を抑止する
 */

/** 被弾判定結果の最小表現型 */
export type HitEvaluationResult = "duplicate" | "missing-local-player" | "no-hit" | "hit";

/** 爆弾被弾報告の送信可否を管理する */
export class HitReportPolicy {
  private readonly reportedBombHitKeys = new Set<string>();

  /** 被弾報告を送信すべき場合に true を返す */
  public shouldSendReport(
    result: HitEvaluationResult | undefined,
    bombId: string,
    targetPlayerId: string,
  ): boolean {
    if (result !== "hit") {
      return false;
    }

    const reportKey = `${bombId}:${targetPlayerId}`;
    if (this.reportedBombHitKeys.has(reportKey)) {
      return false;
    }

    this.reportedBombHitKeys.add(reportKey);
    return true;
  }

  /** 判定済みIDをすべて破棄する */
  public clear(): void {
    this.reportedBombHitKeys.clear();
  }
}