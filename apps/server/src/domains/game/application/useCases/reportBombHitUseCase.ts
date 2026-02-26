/**
 * reportBombHitUseCase
 * 被弾報告を受け取り，死亡通知の配信処理へ橋渡しする
 */
import type {
  BombHitOutputPort,
  BombHitReportValidationPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";
import { shouldPublishPlayerDeadFromBombHit } from "./reportBombHitValidation";

type ReportBombHitUseCaseParams = {
  roomId: string;
  validation: BombHitReportValidationPort;
  input: ReportBombHitInput;
  output: BombHitOutputPort;
};

/** 被弾報告を死亡通知へ変換して配信する */
const publishPlayerDeadFromBombHit = (
  roomId: string,
  input: ReportBombHitInput,
  output: BombHitOutputPort,
): void => {
  output.publishPlayerDeadToOthersInRoom(roomId, input.socketId, {
    playerId: input.socketId,
  });
};

/** 被弾報告を受け取り，死亡通知を同一ルームへ配信する */
export const reportBombHitUseCase = ({
  roomId,
  validation,
  input,
  output,
}: ReportBombHitUseCaseParams): void => {
  if (!shouldPublishPlayerDeadFromBombHit(validation, input)) {
    return;
  }

  publishPlayerDeadFromBombHit(roomId, input, output);
};
