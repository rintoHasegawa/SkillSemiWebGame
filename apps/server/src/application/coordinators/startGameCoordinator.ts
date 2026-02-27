/**
 * startGameCoordinator
 * START_GAMEイベントの調停を行い，ルーム状態更新とゲーム開始処理を橋渡しする
 */
import { type StartGameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { StartGameCoordinatorDeps } from "./coordinatorDeps";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import {
  createBalancedSessionPlayerIds,
  isBotPlayerId,
} from "@server/domains/game/application/services/bot";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";

type StartGameCoordinatorParams = {
  ownerId: string;
  requestedPlayerCount?: number;
} & StartGameCoordinatorDeps & {
    output: StartGameOutputPort;
  };

/** START_GAME受信時にルーム状態遷移を判定し，ゲーム開始ユースケースを実行する */
export const startGameCoordinator = ({
  ownerId,
  requestedPlayerCount,
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
  const gameManager = runtimeRegistry.getGameManagerByRoomId(
    updatedRoom.roomId,
  );
  if (!gameManager) {
    return;
  }

  gameManager.resetPlayerIdentitySession();

  const sessionHumanPlayerIds = humanPlayerIds.map((socketId) => {
    return gameManager.issuePlayerIdForSocket(socketId);
  });

  const humanPlayerBindings = humanPlayerIds.flatMap((socketId, index) => {
    const playerId = sessionHumanPlayerIds[index];
    if (!playerId) {
      return [];
    }

    return [{ socketId, playerId }];
  });

  const playerNamesById: Record<string, string> = {};
  updatedRoom.players.forEach((player, index) => {
    const sessionPlayerId = sessionHumanPlayerIds[index];
    if (!sessionPlayerId) {
      return;
    }

    playerNamesById[sessionPlayerId] = player.name;
  });

  const sessionPlayerIds = createBalancedSessionPlayerIds(
    updatedRoom.roomId,
    sessionHumanPlayerIds,
    requestedPlayerCount,
  );

  sessionPlayerIds.forEach((playerId) => {
    if (!isBotPlayerId(playerId)) {
      return;
    }

    gameManager.registerBotPlayerId(playerId);
    playerNamesById[playerId] = "BOT";
  });

  startGameUseCase({
    roomId: updatedRoom.roomId,
    playerIds: sessionPlayerIds,
    playerNamesById,
    humanPlayerBindings,
    gameSession: gameManager,
    bombStore: gameManager,
    onGameEnd: () => {
      roomManager.markRoomWaiting(updatedRoom.roomId);
    },
    output,
  });
};
