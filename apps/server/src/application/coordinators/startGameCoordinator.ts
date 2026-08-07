/**
 * startGameCoordinator
 * START_GAMEイベントの調停を行い，ルーム状態更新とゲーム開始処理を橋渡しする
 * 開始できない場合はplaying遷移をロールバックし，ルームをwaitingへ戻す
 */
import {
  config as sharedConfig,
  domain,
  type FieldSizePreset,
} from "@repo/shared";
import { config } from "@server/config";
import { type StartGameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import {
  createBalancedSessionPlayerIds,
  isBotPlayerId,
} from "@server/domains/game/application/services/bot";
import type { RoomOutputPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import type { StartGameCoordinatorDeps } from "./coordinatorDeps";

type StartGameCoordinatorParams = {
  ownerId: string;
  requestedPlayerCount?: number;
  requestedFieldSizePreset?: FieldSizePreset;
} & StartGameCoordinatorDeps & {
  output: StartGameOutputPort;
  roomOutput: Pick<RoomOutputPort, "publishRoomUpdateToRoom">;
};

// 要求値・ルーム設定・既定値の順に採用し，未知のプリセットは既定へ寄せる
const resolveFieldSizePreset = (
  requestedFieldSizePreset: FieldSizePreset | undefined,
  storedFieldSizePreset: domain.room.Room["fieldSizePreset"],
): FieldSizePreset => {
  const candidatePreset = requestedFieldSizePreset ?? storedFieldSizePreset;
  return sharedConfig.isFieldSizePreset(candidatePreset)
    ? candidatePreset
    : config.GAME_CONFIG.DEFAULT_FIELD_PRESET;
};

/** START_GAME受信時にルーム状態遷移を判定し，ゲーム開始ユースケースを実行する */
export const startGameCoordinator = ({
  ownerId,
  requestedPlayerCount,
  requestedFieldSizePreset,
  roomManager,
  runtimeRegistry,
  output,
  roomOutput,
}: StartGameCoordinatorParams) => {
  // ルーム状態の変化は既存のROOM_UPDATE経路でルーム全員へ配信する
  const publishRoomUpdate = (targetRoom: domain.room.Room) => {
    roomOutput.publishRoomUpdateToRoom(targetRoom.roomId, targetRoom);
  };

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

  const resolvedFieldSizePreset = resolveFieldSizePreset(
    requestedFieldSizePreset,
    updatedRoom.fieldSizePreset,
  );
  const resolvedGridSize = sharedConfig.resolveFieldGridSize(
    resolvedFieldSizePreset,
  );

  const humanPlayerIds = updatedRoom.players.map((player) => player.id);
  const playerNamesById = Object.fromEntries(
    updatedRoom.players.map((player) => [player.id, player.name]),
  );
  const sessionPlayerIds = createBalancedSessionPlayerIds(
    updatedRoom.roomId,
    humanPlayerIds,
    requestedPlayerCount,
  );
  sessionPlayerIds.forEach((playerId) => {
    if (!isBotPlayerId(playerId)) {
      return;
    }

    playerNamesById[playerId] = "BOT";
  });
  const gameManager = runtimeRegistry.getGameManagerByRoomId(
    updatedRoom.roomId,
  );
  if (!gameManager) {
    // ランタイム未解決時はplaying遷移を取り消し，ルームが取り残されないようにする
    const rollbackResult = roomManager.markRoomWaiting(updatedRoom.roomId);

    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_MISSING_RUNTIME,
      roomId: updatedRoom.roomId,
      socketId: ownerId,
      rollbackStatus: rollbackResult.status,
    });

    if (rollbackResult.status === "updated") {
      publishRoomUpdate(rollbackResult.room);
    }
    return;
  }

  // 反映でルーム自体が書き換わるため，変化判定は反映前に行う
  const isFieldSizePresetChanged =
    updatedRoom.fieldSizePreset !== resolvedFieldSizePreset;
  // 解決後プリセットをroomManager経由で反映し，変化した場合のみ配信する
  const presetAppliedRoom =
    roomManager.applyFieldSizePreset(
      updatedRoom.roomId,
      resolvedFieldSizePreset,
    ) ?? updatedRoom;
  if (isFieldSizePresetChanged) {
    publishRoomUpdate(presetAppliedRoom);
  }

  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.START_GAME,
    result: logResults.ACCEPTED,
    roomId: updatedRoom.roomId,
    socketId: ownerId,
    totalPlayers: updatedRoom.players.length,
    fieldSizePreset: resolvedFieldSizePreset,
  });

  // player_selectモード時は各プレイヤーの希望チームIDを収集する
  const teamPreferences = updatedRoom.teamAssignmentMode === "player_select"
    ? Object.fromEntries(
        updatedRoom.players.map((player) => [player.id, player.preferredTeamId]),
      )
    : undefined;

  startGameUseCase({
    roomId: updatedRoom.roomId,
    fieldConfig: {
      fieldSizePreset: resolvedFieldSizePreset,
      gridCols: resolvedGridSize.cols,
      gridRows: resolvedGridSize.rows,
    },
    playerIds: sessionPlayerIds,
    playerNamesById,
    teamPreferences,
    gameSession: gameManager,
    bombStore: gameManager,
    onGameEnd: () => {
      roomManager.deleteRoom(updatedRoom.roomId);
      runtimeRegistry.cleanupGameManagerForRoom(updatedRoom.roomId);
    },
    output,
  });
};
