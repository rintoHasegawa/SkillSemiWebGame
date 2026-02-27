/**
 * bombHitReport
 * 被弾報告イベントの重複排除キー生成を提供する
 */

/** 被弾報告の重複排除に利用するキーを生成する */
export const createBombHitReportDedupeKey = (
  reporterSocketId: string,
  bombId: string,
  targetPlayerId?: string,
): string => {
  if (targetPlayerId) {
    return `${bombId}:${targetPlayerId}`;
  }

  return `${reporterSocketId}:${bombId}`;
};
