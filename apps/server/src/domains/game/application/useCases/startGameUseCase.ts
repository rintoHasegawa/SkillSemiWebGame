/**
 * startGameUseCase
 * ルーム内プレイヤーでゲームセッションを開始し，進行イベントを通知する
 */
import type { GameOutputPort, StartGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logger";
import { gameUseCaseLogEvents, logResults, logScopes } from "@server/logging/index";

const excludeRecipientFromPlayerUpdates = <TPlayerUpdate extends { id: string }>(
  playerUpdates: TPlayerUpdate[],
  recipientId: string
): TPlayerUpdate[] => {
  return playerUpdates.filter((playerUpdate) => playerUpdate.id !== recipientId);
};

type StartGameUseCaseParams = {
  roomId: string;
  playerIds: string[];
  gameManager: StartGamePort;
  onGameEnd: () => void;
  output: Pick<
    GameOutputPort,
    | "publishUpdatePlayersToRoom"
    | "publishUpdatePlayersToSocket"
    | "publishMapCellUpdatesToRoom"
    | "publishGameEndToRoom"
    | "publishGameResultToRoom"
    | "publishGameStartToRoom"
  >;
};

/** ゲームセッション開始とティック通知，終了通知を実行する */
export const startGameUseCase = ({
  roomId,
  playerIds,
  gameManager,
  onGameEnd,
  output,
}: StartGameUseCaseParams) => {
  gameManager.startRoomSession(
    playerIds,
    (tickData) => {
      if (tickData.playerUpdates.length > 0) {
        playerIds.forEach((playerId) => {
          const updatesForPlayer = excludeRecipientFromPlayerUpdates(
            tickData.playerUpdates,
            playerId
          );

          if (updatesForPlayer.length === 0) {
            return;
          }

          output.publishUpdatePlayersToSocket(playerId, updatesForPlayer);
        });
      }

      if (tickData.cellUpdates.length > 0) {
        output.publishMapCellUpdatesToRoom(roomId, tickData.cellUpdates);
      }
    },
    (resultPayload) => {
      logEvent(logScopes.GAME_USE_CASE, {
        event: gameUseCaseLogEvents.GAME_END,
        result: logResults.EMITTED,
        roomId,
        reason: "duration_elapsed",
      });
      output.publishGameEndToRoom(roomId);
      output.publishGameResultToRoom(roomId, resultPayload);
      onGameEnd();
    }
  );

  const startTime = gameManager.getRoomStartTime() || Date.now();
  output.publishGameStartToRoom(roomId, { startTime });
};
