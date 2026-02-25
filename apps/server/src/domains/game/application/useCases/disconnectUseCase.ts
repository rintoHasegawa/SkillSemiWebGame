/**
 * disconnectUseCase
 * 切断したプレイヤーをゲーム状態から除外し，必要に応じて通知を行う
 */
import type { DisconnectPlayerPort, GameOutputPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";
import { gameUseCaseLogEvents, logResults } from "@server/logging/logEvents";

type DisconnectUseCaseParams = {
  gameManager: DisconnectPlayerPort;
  roomId?: string;
  playerId: string;
  output: Pick<GameOutputPort, "publishPlayerRemovedToRoom">;
};

/** プレイヤー切断時の状態更新と通知を実行する */
export const disconnectUseCase = ({
  gameManager,
  roomId,
  playerId,
  output,
}: DisconnectUseCaseParams) => {
  gameManager.removePlayer(playerId);

  if (roomId) {
    output.publishPlayerRemovedToRoom(roomId, playerId);
  }

  logEvent("GameUseCase", {
    event: gameUseCaseLogEvents.DISCONNECT,
    result: logResults.PLAYER_REMOVED,
    socketId: playerId,
  });
};
