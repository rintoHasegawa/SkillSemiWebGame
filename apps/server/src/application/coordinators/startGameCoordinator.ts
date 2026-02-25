/**
 * startGameCoordinator
 * START_GAMEイベントの調停を行い，ルーム状態更新とゲーム開始処理を橋渡しする
 */
import {
  type BombCleanupPort,
  type GameOutputPort,
  type StartGamePort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  FindRoomByOwnerPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { logEvent } from "@server/logging/logger";
import { gameUseCaseLogEvents, logResults, logScopes } from "@server/logging/index";
import { roomConsts } from "@repo/shared";

type StartGameCoordinatorParams = {
  ownerId: string;
  gameManager: StartGamePort;
  bombState: BombCleanupPort;
  roomManager: FindRoomByOwnerPort & RoomPhaseTransitionPort;
  output: Pick<
    GameOutputPort,
    | "publishUpdatePlayersToRoom"
    | "publishMapCellUpdatesToRoom"
    | "publishGameEndToRoom"
    | "publishGameResultToRoom"
    | "publishGameStartToRoom"
  >;
};

/** START_GAME受信時にルーム状態遷移を判定し，ゲーム開始ユースケースを実行する */
export const startGameCoordinator = ({
  ownerId,
  gameManager,
  bombState,
  roomManager,
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

  if (room.status === roomConsts.RoomPhase.PLAYING) {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_ALREADY_PLAYING,
      roomId: room.roomId,
      socketId: ownerId,
    });
    return;
  }

  const updatedRoom = roomManager.markRoomPlaying(room.roomId);
  if (!updatedRoom) {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_ROOM_NOT_FOUND,
      roomId: room.roomId,
      socketId: ownerId,
    });
    return;
  }

  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.START_GAME,
    result: logResults.ACCEPTED,
    roomId: updatedRoom.roomId,
    socketId: ownerId,
    totalPlayers: updatedRoom.players.length,
  });

  const playerIds = updatedRoom.players.map((player) => player.id);

  startGameUseCase({
    roomId: updatedRoom.roomId,
    playerIds,
    gameManager,
    onGameEnd: () => {
      roomManager.markRoomWaiting(updatedRoom.roomId);
      bombState.clearBombRoomState(updatedRoom.roomId, "game-ended");
    },
    output,
  });
};
