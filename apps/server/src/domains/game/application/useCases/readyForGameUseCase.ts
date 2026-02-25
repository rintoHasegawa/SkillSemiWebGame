/**
 * readyForGameUseCase
 * READY_FOR_GAME受信時に現在プレイヤー状態と開始時刻を返却する
 */
import type { ReadyForGamePort } from "../ports/gameUseCasePorts";
import type { GameOutputPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logger";
import { gameUseCaseLogEvents, logResults, logScopes } from "@server/logging/index";

type ReadyForGameUseCaseParams = {
  socketId: string;
  roomId?: string;
  gameManager: ReadyForGamePort;
  output: Pick<GameOutputPort, "publishCurrentPlayersToSocket" | "publishGameStartToSocket">;
};

/** 準備完了通知に対してルーム状態を返却し，開始済みなら開始時刻も通知する */
export const readyForGameUseCase = ({
  socketId,
  roomId,
  gameManager,
  output,
}: ReadyForGameUseCaseParams) => {
  if (!roomId) {
    output.publishCurrentPlayersToSocket([]);
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.READY_FOR_GAME,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId,
    });
    return;
  }

  const roomPlayers = gameManager.getRoomPlayers(roomId);
  output.publishCurrentPlayersToSocket(roomPlayers);

  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.READY_FOR_GAME,
    result: logResults.RECEIVED,
    socketId,
    roomId,
    totalPlayers: roomPlayers.length,
  });

  const startTime = gameManager.getRoomStartTime(roomId);
  if (!startTime) {
    return;
  }

  output.publishGameStartToSocket({ startTime });
  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.GAME_START,
    result: logResults.EMITTED,
    socketId,
    roomId,
    startTime,
  });
};
