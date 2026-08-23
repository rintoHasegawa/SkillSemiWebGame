/**
 * roomEventOrchestrators
 * ルーム受信イベントごとの調停処理を提供する
 * 受信ハンドラからユースケース実行責務を分離する
 * 本ファイルではランタイム未解決ログ対象イベントを扱わない
 */
import { domain } from "@repo/shared";
import type { LobbySettingsUpdatePayload, SelectTeamPayload } from "@repo/shared";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomUseCaseLogEvents } from "@server/logging/index";
import type {
  JoinRoomEventRoomUseCasePort,
  JoinRoomEventRuntimeUseCasePort,
  LobbySettingsUpdateEventRoomUseCasePort,
  SelectTeamEventRoomUseCasePort,
} from "@server/network/types/connectionPorts";
import { logIgnoredMissingRoom } from "../orchestratorEventLogger";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";

/** JOIN_ROOMイベント調停で利用する依存集合 */
export type JoinRoomOrchestratorDeps = {
  socketId: string;
  roomManager: JoinRoomEventRoomUseCasePort;
  runtimeRegistry: JoinRoomEventRuntimeUseCasePort;
  output: RoomOutputAdapter;
  joinRoom: (roomId: string) => Promise<void>;
};

/** JOIN_ROOMイベントの入力ペイロード型 */
export type JoinRoomEventPayload = Parameters<typeof handleJoinRoomEvent>[1];

/** LOBBY_SETTINGS_UPDATEイベント調停で利用する依存集合 */
export type LobbySettingsUpdateOrchestratorDeps = {
  socketId: string;
  roomManager: LobbySettingsUpdateEventRoomUseCasePort;
  output: RoomOutputAdapter;
};

/** SELECT_TEAMイベント調停で利用する依存集合 */
export type SelectTeamOrchestratorDeps = {
  socketId: string;
  roomManager: SelectTeamEventRoomUseCasePort;
  output: RoomOutputAdapter;
};

/** LOBBY_SETTINGS_UPDATEイベントを調停してルーム設定を更新し全員に通知する */
export const handleLobbySettingsUpdateEvent = (
  deps: LobbySettingsUpdateOrchestratorDeps,
  payload: LobbySettingsUpdatePayload,
): void => {
  const room = deps.roomManager.getRoomByOwnerId(deps.socketId);
  if (!room) {
    // オーナーとして紐づくルームが無い要求はクライアントへ通知せずログのみ残す
    logIgnoredMissingRoom(
      roomUseCaseLogEvents.LOBBY_SETTINGS_UPDATE,
      deps.socketId,
    );
    return;
  }

  // 値に変化がなければ更新・配信をスキップする
  if (
    room.targetPlayerCount === payload.targetPlayerCount &&
    room.fieldSizePreset === payload.fieldSizePreset &&
    room.teamAssignmentMode === payload.teamAssignmentMode
  ) {
    logEvent(logScopes.NETWORK, {
      event: roomUseCaseLogEvents.LOBBY_SETTINGS_UPDATE,
      result: logResults.IGNORED_NO_CHANGE,
      socketId: deps.socketId,
      roomId: room.roomId,
    });
    return;
  }

  const updatedRoom = deps.roomManager.updateLobbySettings(
    room.roomId,
    payload.targetPlayerCount,
    payload.fieldSizePreset,
    payload.teamAssignmentMode,
  );
  if (!updatedRoom) {
    // 検証失敗・ルーム消滅などで更新が適用されなかった場合を記録する
    logEvent(logScopes.NETWORK, {
      event: roomUseCaseLogEvents.LOBBY_SETTINGS_UPDATE,
      result: logResults.IGNORED_UPDATE_FAILED,
      socketId: deps.socketId,
      roomId: room.roomId,
    });
    return;
  }

  deps.output.publishRoomUpdateToRoom(room.roomId, updatedRoom);
};

/** SELECT_TEAMイベントを調停してプレイヤーのチーム選択を更新し全員に通知する */
export const handleSelectTeamEvent = (
  deps: SelectTeamOrchestratorDeps,
  payload: SelectTeamPayload,
): void => {
  const result = deps.roomManager.selectTeam(
    deps.socketId,
    payload.preferredTeamId,
  );

  switch (result.status) {
    case "team_full":
      deps.output.publishSelectTeamRejectedToSocket(result.teamId);
      return;

    case "invalid_team":
      // 有効範囲外のチームIDはクライアントへ通知せずサーバログのみ残す
      logEvent(logScopes.NETWORK, {
        event: roomUseCaseLogEvents.SELECT_TEAM,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        socketId: deps.socketId,
      });
      return;

    case "ok":
      deps.output.publishRoomUpdateToRoom(result.room.roomId, result.room);
      return;

    case "not_found":
      // 所属ルームを引けない要求はクライアントへ通知せずサーバログのみ残す
      logIgnoredMissingRoom(roomUseCaseLogEvents.SELECT_TEAM, deps.socketId);
      return;

    default:
      return;
  }
};

/** JOIN_ROOMイベントを調停して参加ユースケースを実行する */
export const handleJoinRoomEvent = async (
  deps: JoinRoomOrchestratorDeps,
  payload: domain.room.JoinRoomPayload,
): Promise<void> => {
  const joinResult = joinRoomUseCase({
    roomManager: deps.roomManager,
    runtimeRegistry: deps.runtimeRegistry,
    socketId: deps.socketId,
    data: payload,
    output: deps.output,
  });

  switch (joinResult.status) {
    case "full":
      logEvent(logScopes.NETWORK, {
        event: roomUseCaseLogEvents.JOIN_ROOM,
        result: logResults.REJECTED_ROOM_FULL,
        roomId: payload.roomId,
        socketId: deps.socketId,
      });
      return;

    case "playing":
      logEvent(logScopes.NETWORK, {
        event: roomUseCaseLogEvents.JOIN_ROOM,
        result: logResults.REJECTED_ROOM_PLAYING,
        roomId: payload.roomId,
        socketId: deps.socketId,
      });
      return;

    case "duplicate":
      logEvent(logScopes.NETWORK, {
        event: roomUseCaseLogEvents.JOIN_ROOM,
        result: logResults.REJECTED_DUPLICATE,
        roomId: payload.roomId,
        socketId: deps.socketId,
      });
      return;

    case "joined":
      // 参加先は正規化済みのルームIDで揃える（受信ペイロードの前後空白を持ち込まない）
      await deps.joinRoom(joinResult.room.roomId);
      deps.output.publishRoomUpdateToRoom(
        joinResult.room.roomId,
        joinResult.room,
      );
      logEvent(logScopes.ROOM_USE_CASE, {
        event: roomUseCaseLogEvents.ROOM_UPDATE,
        result: logResults.EMITTED,
        roomId: joinResult.room.roomId,
        socketId: deps.socketId,
        ownerId: joinResult.room.ownerId,
        totalPlayers: joinResult.room.players.length,
      });
      return;

    default:
      return;
  }
};
