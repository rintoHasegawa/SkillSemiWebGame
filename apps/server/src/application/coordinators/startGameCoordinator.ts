/**
 * startGameCoordinator
 * START_GAMEイベントの調停を行い，ルーム状態更新とゲーム開始処理を橋渡しする
 */
import { type StartGameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { StartGameCoordinatorDeps } from "./coordinatorDeps";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { createBalancedSessionPlayerIds } from "@server/domains/game/application/services/BotRosterService";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";

type StartGameCoordinatorParams = {
  ownerId: string;
} & StartGameCoordinatorDeps & {
    output: StartGameOutputPort;
  };

/** START_GAME受信時にルーム状態遷移を判定し，ゲーム開始ユースケースを実行する */
export const startGameCoordinator = ({
  ownerId,
  roomManager,
  runtimeRegistry,
  output,
}: StartGameCoordinatorParams) => {
  const room = roomManager.getRoomByOwnerId(ownerId);
  if (!room) {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_NO_ROOM,
      socketId: ownerId,
    });
    return;
  }

  const transitionResult = roomManager.markRoomPlaying(room.roomId);
  if (transitionResult.status === "not_found") {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_ROOM_NOT_FOUND,
      roomId: room.roomId,
      socketId: ownerId,
    });
    return;
  }

  if (transitionResult.status === "invalid_transition") {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_ALREADY_PLAYING,
      roomId: room.roomId,
      socketId: ownerId,
    });
    return;
  }

  const updatedRoom = transitionResult.room;
  if (!updatedRoom) {
    return;
  }

  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.START_GAME,
    result: logResults.ACCEPTED,
    roomId: updatedRoom.roomId,
    socketId: ownerId,
    totalPlayers: updatedRoom.players.length,
  });

  const humanPlayerIds = updatedRoom.players.map((player) => player.id);
  const sessionPlayerIds = createBalancedSessionPlayerIds(
    updatedRoom.roomId,
    humanPlayerIds,
  );
  const gameManager = runtimeRegistry.getGameManagerByRoomId(
    updatedRoom.roomId,
  );
  if (!gameManager) {
    return;
  }

  startGameUseCase({
    roomId: updatedRoom.roomId,
    playerIds: sessionPlayerIds,
    recipientPlayerIds: humanPlayerIds,
    gameSession: gameManager,
    bombStore: gameManager,
    onGameEnd: () => {
      roomManager.markRoomWaiting(updatedRoom.roomId);
    },
    output,
  });
};
