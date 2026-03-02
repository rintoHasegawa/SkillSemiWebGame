/**
 * reportBombHitUseCase
 * 被弾報告を受け取り，死亡通知の配信処理へ橋渡しする
 * Bot被弾はサーバー側GameLoopで直接検知するため，自プレイヤーの報告のみ受け付ける
 */
import type {
  PlayerDeadOutputPort,
  BombHitReportValidationPort,
  BombHitStatsPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";
import { shouldPublishPlayerDeadFromBombHit } from "./reportBombHitValidation";

type ReportBombHitUseCaseParams = {
  roomId: string;
  validation: BombHitReportValidationPort;
  stats: BombHitStatsPort;
  input: ReportBombHitInput;
  output: PlayerDeadOutputPort;
};

/** 被弾報告を受け取り，死亡通知を同一ルームへ配信する */
export const reportBombHitUseCase = ({
  roomId,
  validation,
  stats,
  input,
  output,
}: ReportBombHitUseCaseParams): void => {
  if (!shouldPublishPlayerDeadFromBombHit(validation, input)) {
    return;
  }

  stats.recordBombHitForOwner(input.payload.bombId);

  const deadPlayerId = input.socketId;

  output.publishPlayerDeadToOthersInRoom(roomId, deadPlayerId, {
    playerId: deadPlayerId,
  });
};
