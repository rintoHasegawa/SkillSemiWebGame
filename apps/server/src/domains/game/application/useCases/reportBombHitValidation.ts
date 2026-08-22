import type {
  BombHitReportValidationPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";
import { createBombHitReportDedupeKey } from "@server/domains/game/entities/bomb/bombHitReport";

/** 受信した被弾報告を処理対象にすべきか判定する */
export const shouldPublishPlayerHitFromBombHit = (
  validation: BombHitReportValidationPort,
  input: ReportBombHitInput,
): boolean => {
  // 自チームの爆弾では被弾しない（SPEC_03）ため，設置者本人・味方からの報告は
  // 改造クライアントによるスタッツ水増しとみなして処理しない
  if (
    validation.isSameTeamBombHitReport(input.socketId, input.payload.bombId)
  ) {
    return false;
  }

  const dedupeKey = createBombHitReportDedupeKey(
    input.socketId,
    input.payload.bombId,
  );
  return validation.shouldBroadcastBombHitReport(dedupeKey, input.nowMs);
};
