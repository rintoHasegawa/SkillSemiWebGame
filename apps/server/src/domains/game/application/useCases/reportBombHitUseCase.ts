/**
 * reportBombHitUseCase
 * 被弾報告を受け取り，死亡通知の配信処理へ橋渡しする
 */
import type {
  BombHitOutputPort,
  ReportBombHitInput,
} from "../ports/gameUseCasePorts";

type ReportBombHitUseCaseParams = {
  roomId: string;
  input: ReportBombHitInput;
  output: BombHitOutputPort;
};

/** 被弾報告を受け取り，死亡通知を同一ルームへ配信する */
export const reportBombHitUseCase = ({
  roomId,
  input,
  output,
}: ReportBombHitUseCaseParams): void => {
  output.publishPlayerDeadToOthersInRoom(roomId, input.socketId, {
    playerId: input.socketId,
  });
};
