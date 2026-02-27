/**
 * reportBombHitUseCase
 * 被弾報告を受け取り，死亡通知の配信処理へ橋渡しする
 */
import type {
  BotHitReactionPort,
  BombHitOutputPort,
  BombHitReportValidationPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";
import { shouldPublishPlayerDeadFromBombHit } from "./reportBombHitValidation";

type ReportBombHitUseCaseParams = {
  roomId: string;
  validation: BombHitReportValidationPort;
  botHitReaction: BotHitReactionPort;
  input: ReportBombHitInput;
  output: BombHitOutputPort;
};

/** 被弾報告を死亡通知へ変換して配信する */
const publishPlayerDeadFromBombHit = (
  roomId: string,
  input: ReportBombHitInput,
  output: BombHitOutputPort,
): void => {
  const deadPlayerId = input.payload.targetPlayerId ?? input.socketId;

  output.publishPlayerDeadToOthersInRoom(roomId, deadPlayerId, {
    playerId: deadPlayerId,
  });
};

/** 被弾報告を受け取り，死亡通知を同一ルームへ配信する */
export const reportBombHitUseCase = ({
  roomId,
  validation,
  botHitReaction,
  input,
  output,
}: ReportBombHitUseCaseParams): void => {
  if (!shouldPublishPlayerDeadFromBombHit(validation, input)) {
    return;
  }

  const targetPlayerId = input.payload.targetPlayerId;
  if (targetPlayerId) {
    botHitReaction.applyBotHitStun(targetPlayerId, input.nowMs);
  }

  publishPlayerDeadFromBombHit(roomId, input, output);
};
