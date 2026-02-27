import type {
  BombHitReportValidationPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";
import { createBombHitReportDedupeKey } from "@server/domains/game/entities/bomb/bombHitReport";

/** 受信した被弾報告を処理対象にすべきか判定する */
export const shouldPublishPlayerDeadFromBombHit = (
  validation: BombHitReportValidationPort,
  input: ReportBombHitInput,
): boolean => {
  const dedupeKey = createBombHitReportDedupeKey(
    input.socketId,
    input.payload.bombId,
    input.payload.targetPlayerId,
  );
  return validation.shouldBroadcastBombHitReport(dedupeKey, input.nowMs);
};
