/**
 * reportBombHitValidation
 * 受信した被弾報告を処理対象にすべきか判定する
 * サーバー既知の爆弾状態（実在・受理時刻窓・距離）とチーム・重複排除を順に検証する
 */
import type {
  BombHitReportValidationPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";
import { createBombHitReportDedupeKey } from "@server/domains/game/entities/bomb/bombHitReport";

/** 被弾報告の受理可否と拒否理由を表す判定結果 */
export type BombHitReportDecision =
  | { status: "accepted" }
  | { status: "unknown_bomb" }
  | { status: "expired" }
  | { status: "too_far" }
  | { status: "same_team" }
  | { status: "duplicate" };

/** 受信した被弾報告を処理対象にすべきか判定する */
export const decideBombHitReport = (
  validation: BombHitReportValidationPort,
  input: ReportBombHitInput,
): BombHitReportDecision => {
  // 実在しない爆弾ID・受理時刻窓外・爆風から離れすぎた報告は偽装とみなす
  const origin = validation.checkBombHitReportOrigin(
    input.socketId,
    input.payload.bombId,
  );
  if (origin.status !== "valid") {
    return origin;
  }

  // 自チームの爆弾では被弾しない（SPEC_03）ため，設置者本人・味方からの報告は
  // 改造クライアントによるスタッツ水増しとみなして処理しない
  if (
    validation.isSameTeamBombHitReport(input.socketId, input.payload.bombId)
  ) {
    return { status: "same_team" };
  }

  // 重複排除は最後に判定する（拒否される報告に重複排除枠を消費させない）
  const dedupeKey = createBombHitReportDedupeKey(
    input.socketId,
    input.payload.bombId,
  );
  if (!validation.shouldBroadcastBombHitReport(dedupeKey)) {
    return { status: "duplicate" };
  }

  return { status: "accepted" };
};
