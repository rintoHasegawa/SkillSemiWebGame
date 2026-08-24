/**
 * reportBombHitUseCase
 * 被弾報告を受け取り，死亡通知の配信処理へ橋渡しする
 * Bot被弾はサーバー側GameLoopで直接検知するため，自プレイヤーの報告のみ受け付ける
 */
import type {
  PlayerHitOutputPort,
  BombHitReportValidationPort,
  BombHitStatsPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";
import {
  decideBombHitReport,
  type BombHitReportDecision,
} from "./reportBombHitValidation";

type ReportBombHitUseCaseParams = {
  roomId: string;
  validation: BombHitReportValidationPort;
  stats: BombHitStatsPort;
  input: ReportBombHitInput;
  output: PlayerHitOutputPort;
};

/** 被弾報告を受け取り，受理時のみ死亡通知を同一ルームへ配信する */
export const reportBombHitUseCase = ({
  roomId,
  validation,
  stats,
  input,
  output,
}: ReportBombHitUseCaseParams): BombHitReportDecision => {
  const decision = decideBombHitReport(validation, input);
  if (decision.status !== "accepted") {
    return decision;
  }

  stats.recordBombHitForOwner(input.payload.bombId);

  const deadPlayerId = input.socketId;

  output.publishPlayerHitToOthersInRoom(roomId, deadPlayerId, {
    playerId: deadPlayerId,
  });

  return decision;
};
