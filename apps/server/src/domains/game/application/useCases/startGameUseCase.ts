/**
 * startGameUseCase
 * ルーム内プレイヤーでゲームセッションを開始し，進行イベントを通知する
 */
import type { GameOutputPort, StartGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";
import { gameUseCaseLogEvents, logResults, logScopes } from "@server/logging/logEvents";

type StartGameUseCaseParams = {
  roomId: string;
  playerIds: string[];
  gameManager: StartGamePort;
  onGameEnd: () => void;
  output: Pick<
    GameOutputPort,
    | "publishUpdatePlayersToRoom"
    | "publishMapCellUpdatesToRoom"
    | "publishGameEndToRoom"
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
    roomId,
    playerIds,
    (tickData) => {
      if (tickData.playerUpdates.length > 0) {
        output.publishUpdatePlayersToRoom(roomId, tickData.playerUpdates);
      }

      if (tickData.cellUpdates.length > 0) {
        output.publishMapCellUpdatesToRoom(roomId, tickData.cellUpdates);
      }
    },
    () => {
      logEvent(logScopes.GAME_USE_CASE, {
        event: gameUseCaseLogEvents.GAME_END,
        result: logResults.EMITTED,
        roomId,
        reason: "duration_elapsed",
      });
      output.publishGameEndToRoom(roomId);
      onGameEnd();
    }
  );

  const startTime = gameManager.getRoomStartTime(roomId) || Date.now();
  output.publishGameStartToRoom(roomId, { startTime });
};
