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
import type { LogPayloadByScope } from "@server/logging/contracts/payloadByScope";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import type {
  ReleaseRoomSessionReservationPort,
  StartGameCoordinatorDeps,
} from "./coordinatorDeps";

type StartGameCoordinatorParams = {
  ownerId: string;
  requestedPlayerCount?: number;
  requestedFieldSizePreset?: FieldSizePreset;
} & StartGameCoordinatorDeps & {
  output: StartGameOutputPort;
  roomOutput: Pick<
    RoomOutputPort,
    "publishRoomUpdateToRoom" | "closeRoomChannel"
  >;
  /** 試合終了時に復帰予約を解放するためのレジストリ */
  sessionReservations: ReleaseRoomSessionReservationPort;
};

type StartGameRoomManager = StartGameCoordinatorDeps["roomManager"];

// START_GAMEログは結果値と付随情報のみが異なるため，契約から導出して二重定義を避ける
type StartGameLogDetail = Omit<
  Extract<
    LogPayloadByScope[typeof logScopes.GAME_USE_CASE],
    { event: typeof gameUseCaseLogEvents.START_GAME }
  >,
  "event"
>;

// ルーム状態の変化を配信するための通知関数
type PublishRoomUpdate = (targetRoom: domain.room.Room) => void;

// 同形のSTART_GAMEログをまとめ，呼び出し側は結果値と付随情報だけを指定する
const logStartGame = (detail: StartGameLogDetail) => {
  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.START_GAME,
    ...detail,
  });
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

type ResolveStartableRoomParams = {
  ownerId: string;
  roomManager: Pick<
    StartGameRoomManager,
    "getRoomByOwnerId" | "markRoomPlaying"
  >;
};

// ルーム解決とplaying遷移をまとめ，開始できない場合は理由をログして未定義を返す
const resolveStartableRoom = ({
  ownerId,
  roomManager,
}: ResolveStartableRoomParams): domain.room.Room | undefined => {
  const room = roomManager.getRoomByOwnerId(ownerId);
  if (!room) {
    logStartGame({
      result: logResults.IGNORED_NO_ROOM,
      socketId: ownerId,
    });
    return undefined;
  }

  const transitionResult = roomManager.markRoomPlaying(room.roomId);
  if (transitionResult.status === "not_found") {
    logStartGame({
      result: logResults.IGNORED_ROOM_NOT_FOUND,
      roomId: room.roomId,
      socketId: ownerId,
    });
    return undefined;
  }

  if (transitionResult.status === "invalid_transition") {
    logStartGame({
      result: logResults.IGNORED_ALREADY_PLAYING,
      roomId: room.roomId,
      socketId: ownerId,
    });
    return undefined;
  }

  return transitionResult.room;
};

type SessionRoster = {
  /** Bot補充後のセッション参加者ID一覧 */
  sessionPlayerIds: string[];
  /** 参加者IDから表示名を引く対応表 */
  playerNamesById: Record<string, string>;
};

// 人間プレイヤーへBotを補充した参加者一覧と，表示名の対応表を組み立てる
const buildSessionRoster = (
  room: domain.room.Room,
  requestedPlayerCount: number | undefined,
): SessionRoster => {
  const humanPlayerIds = room.players.map((player) => player.id);
  const playerNamesById = Object.fromEntries(
    room.players.map((player) => [player.id, player.name]),
  );
  const sessionPlayerIds = createBalancedSessionPlayerIds(
    room.roomId,
    humanPlayerIds,
    requestedPlayerCount,
  );
  sessionPlayerIds.forEach((playerId) => {
    if (!isBotPlayerId(playerId)) {
      return;
    }

    playerNamesById[playerId] = "BOT";
  });

  return { sessionPlayerIds, playerNamesById };
};

type ApplyResolvedFieldPresetParams = {
  room: domain.room.Room;
  resolvedFieldSizePreset: FieldSizePreset;
  roomManager: Pick<StartGameRoomManager, "applyFieldSizePreset">;
  publishRoomUpdate: PublishRoomUpdate;
};

// 解決後プリセットをroomManager経由で反映し，変化した場合のみ配信する
const applyResolvedFieldPreset = ({
  room,
  resolvedFieldSizePreset,
  roomManager,
  publishRoomUpdate,
}: ApplyResolvedFieldPresetParams) => {
  // 反映でルーム自体が書き換わるため，変化判定は反映前に行う
  const isFieldSizePresetChanged =
    room.fieldSizePreset !== resolvedFieldSizePreset;
  const presetAppliedRoom =
    roomManager.applyFieldSizePreset(room.roomId, resolvedFieldSizePreset) ??
    room;
  if (isFieldSizePresetChanged) {
    publishRoomUpdate(presetAppliedRoom);
  }
};

// player_selectモード時のみ各プレイヤーの希望チームIDを収集する
const resolveTeamPreferences = (
  room: domain.room.Room,
): Record<string, number | null> | undefined => {
  if (room.teamAssignmentMode !== "player_select") {
    return undefined;
  }

  return Object.fromEntries(
    room.players.map((player) => [player.id, player.preferredTeamId]),
  );
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
  sessionReservations,
}: StartGameCoordinatorParams) => {
  // ルーム状態の変化は既存のROOM_UPDATE経路でルーム全員へ配信する
  const publishRoomUpdate: PublishRoomUpdate = (targetRoom) => {
    roomOutput.publishRoomUpdateToRoom(targetRoom.roomId, targetRoom);
  };

  const updatedRoom = resolveStartableRoom({ ownerId, roomManager });
  if (!updatedRoom) {
    return;
  }

  const resolvedFieldSizePreset = resolveFieldSizePreset(
    requestedFieldSizePreset,
    updatedRoom.fieldSizePreset,
  );
  const resolvedGridSize = sharedConfig.resolveFieldGridSize(
    resolvedFieldSizePreset,
  );

  const { sessionPlayerIds, playerNamesById } = buildSessionRoster(
    updatedRoom,
    requestedPlayerCount,
  );

  const gameManager = runtimeRegistry.getGameManagerByRoomId(
    updatedRoom.roomId,
  );
  if (!gameManager) {
    // ランタイム未解決時はplaying遷移を取り消し，ルームが取り残されないようにする
    const rollbackResult = roomManager.markRoomWaiting(updatedRoom.roomId);

    logStartGame({
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

  applyResolvedFieldPreset({
    room: updatedRoom,
    resolvedFieldSizePreset,
    roomManager,
    publishRoomUpdate,
  });

  logStartGame({
    result: logResults.ACCEPTED,
    roomId: updatedRoom.roomId,
    socketId: ownerId,
    totalPlayers: updatedRoom.players.length,
    fieldSizePreset: resolvedFieldSizePreset,
  });

  startGameUseCase({
    roomId: updatedRoom.roomId,
    fieldConfig: {
      fieldSizePreset: resolvedFieldSizePreset,
      gridCols: resolvedGridSize.cols,
      gridRows: resolvedGridSize.rows,
    },
    playerIds: sessionPlayerIds,
    playerNamesById,
    teamPreferences: resolveTeamPreferences(updatedRoom),
    gameSession: gameManager,
    bombStore: gameManager,
    onGameEnd: () => {
      // 予約の寿命はセッションの寿命と一致させ，終了後の復帰要求は受け付けない
      sessionReservations.releaseByRoomId(updatedRoom.roomId);
      roomManager.deleteRoom(updatedRoom.roomId);
      runtimeRegistry.cleanupGameManagerForRoom(updatedRoom.roomId);
      // 削除済みルーム宛の配信が残存ソケットへ届かないようチャンネルを閉じる
      roomOutput.closeRoomChannel(updatedRoom.roomId);
    },
    output,
  });
};
