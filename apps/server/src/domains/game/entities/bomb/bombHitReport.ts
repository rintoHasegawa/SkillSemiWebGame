/**
 * bombHitReport
 * 被弾報告イベントの重複排除キー生成を提供する
 */
import { joinDedupeKeySegments } from "./dedupeKeyEncoding.js";

/**
 * 被弾報告の重複排除に利用するキーを生成する
 * reporterSocketId・bombId は任意文字列のため長さプレフィックス方式で連結する
 */
export const createBombHitReportDedupeKey = (
  reporterSocketId: string,
  bombId: string,
): string => {
  return joinDedupeKeySegments(reporterSocketId, bombId);
};
