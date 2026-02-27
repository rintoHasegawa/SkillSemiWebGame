/**
 * disconnectUseCase
 * 切断したプレイヤーをゲーム状態から除外し，必要に応じて通知を行う
 */
import type { DisconnectPlayerPort, GameOutputPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logger";
import { gameUseCaseLogEvents, logResults, logScopes } from "@server/logging/index";

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
  const replacedWithBot = gameManager.replaceDisconnectedPlayerWithBot(playerId);

  if (!replacedWithBot) {
    gameManager.removePlayer(playerId);

    if (roomId) {
      output.publishPlayerRemovedToRoom(roomId, playerId);
    }
  }

  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.DISCONNECT,
    result: logResults.PLAYER_REMOVED,
    socketId: playerId,
    replacedWithBot,
  });
};
