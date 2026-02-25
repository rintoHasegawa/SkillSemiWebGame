/**
 * readyForGameUseCase
 * READY_FOR_GAME受信時に現在プレイヤー状態と開始時刻を返却する
 */
import type { ReadyForGamePort } from "../ports/gameUseCasePorts";
import type { GameOutputPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";
import { gameUseCaseLogEvents } from "@server/logging/logEvents";

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
    logEvent("GameUseCase", {
      event: gameUseCaseLogEvents.READY_FOR_GAME,
      result: "ignored_missing_room",
      socketId,
    });
    return;
  }

  const roomPlayers = gameManager.getRoomPlayers(roomId);
  output.publishCurrentPlayersToSocket(roomPlayers);

  logEvent("GameUseCase", {
    event: gameUseCaseLogEvents.READY_FOR_GAME,
    result: "received",
    socketId,
    roomId,
    totalPlayers: roomPlayers.length,
  });

  const startTime = gameManager.getRoomStartTime(roomId);
  if (!startTime) {
    return;
  }

  output.publishGameStartToSocket({ startTime });
  logEvent("GameUseCase", {
    event: gameUseCaseLogEvents.GAME_START,
    result: "emitted",
    socketId,
    roomId,
    startTime,
  });
};
