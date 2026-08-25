/**
 * roomEventOrchestrators
 * ルーム受信イベントごとの調停処理を提供する
 * 受信ハンドラからユースケース実行責務を分離する
 * 本ファイルではランタイム未解決ログ対象イベントを扱わない
 */
import { domain } from "@repo/shared";
import type { LobbySettingsUpdatePayload, SelectTeamPayload } from "@repo/shared";
import type {
  BindPlayerIdentityPort,
  ConsumeSessionReservationPort,
} from "@server/application/coordinators/coordinatorDeps";
import { resumeSessionCoordinator } from "@server/application/coordinators/resumeSessionCoordinator";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";
import { logEvent } from "@server/logging/logger";
import type { LogPayloadByScope } from "@server/logging/contracts/payloadByScope";
import { logResults, logScopes, roomUseCaseLogEvents } from "@server/logging/index";
import type {
  JoinRoomEventRoomUseCasePort,
  JoinRoomEventRuntimeUseCasePort,
  LeaveRoomEventRoomUseCasePort,
  LeaveRoomEventRuntimeUseCasePort,
  LobbySettingsUpdateEventRoomUseCasePort,
  ResumeSessionEventRoomUseCasePort,
  ResumeSessionEventRuntimeUseCasePort,
  SelectTeamEventRoomUseCasePort,
} from "@server/network/types/connectionPorts";
import type {
  PlayerIdentityRegistry,
  SessionReservationRegistry,
} from "@server/network/identity";
import { logIgnoredMissingRoom } from "../orchestratorEventLogger";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";

// RESUME_SESSIONの通知ログで使える結果値（ログ契約から導出して二重定義を避ける）
type NetworkResumeSessionLogResult = Extract<
  LogPayloadByScope[typeof logScopes.NETWORK],
  { event: typeof roomUseCaseLogEvents.RESUME_SESSION }
>["result"];

/** JOIN_ROOMイベント調停で利用する依存集合 */
export type JoinRoomOrchestratorDeps = {
  /**
   * ルーム名簿上の識別子
   * 復帰済みソケットでは実ソケットIDと異なるため，参照のたびに解決される
   */
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
  /**
   * ルーム名簿上の識別子
   * 復帰済みソケットでは実ソケットIDと異なるため，参照のたびに解決される
   */
  socketId: string;
  roomManager: LobbySettingsUpdateEventRoomUseCasePort;
  output: RoomOutputAdapter;
};

/** SELECT_TEAMイベント調停で利用する依存集合 */
export type SelectTeamOrchestratorDeps = {
  /**
   * ルーム名簿上の識別子
   * 復帰済みソケットでは実ソケットIDと異なるため，参照のたびに解決される
   */
  socketId: string;
  roomManager: SelectTeamEventRoomUseCasePort;
  output: RoomOutputAdapter;
};

/** RESUME_SESSIONイベント調停で利用する依存集合 */
export type ResumeSessionOrchestratorDeps = {
  /** 復帰要求元の実ソケットID（この時点ではプレイヤーIDと一致しない） */
  socketId: string;
  /** ハンドシェイクで受け取ったセッショントークン（未提示は undefined） */
  sessionToken?: string;
  roomManager: ResumeSessionEventRoomUseCasePort;
  runtimeRegistry: ResumeSessionEventRuntimeUseCasePort;
  sessionReservations: ConsumeSessionReservationPort;
  identityRegistry: BindPlayerIdentityPort;
  output: RoomOutputAdapter;
  joinRoomChannel: (roomId: string) => Promise<void>;
};

/** LEAVE_ROOMイベント調停で利用する依存集合 */
export type LeaveRoomOrchestratorDeps = {
  /**
   * ルーム名簿上の識別子
   * 復帰済みソケットでは実ソケットIDと異なるため，参照のたびに解決される
   */
  playerId: string;
  /** 実ソケットID（識別子の解放に使う） */
  socketId: string;
  /** ハンドシェイクで受け取ったセッショントークン（未提示は undefined） */
  sessionToken?: string;
  roomManager: LeaveRoomEventRoomUseCasePort;
  runtimeRegistry: LeaveRoomEventRuntimeUseCasePort;
  sessionReservations: Pick<SessionReservationRegistry, "releaseByToken">;
  identityRegistry: Pick<PlayerIdentityRegistry, "release">;
  output: RoomOutputAdapter;
  leaveRoomChannel: (roomId: string) => Promise<void>;
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

/**
 * RESUME_SESSIONイベントを調停して復帰処理を実行し，結果をソケットへ通知する
 * 復帰できない場合は理由付きで拒否し，クライアント側でタイトルへ戻せるようにする
 */
export const handleResumeSessionEvent = async (
  deps: ResumeSessionOrchestratorDeps,
): Promise<void> => {
  // 復帰結果ごとに残す通知ログ（配信の直後に同じ形式で記録する）
  const logResumeSessionNotice = (
    result: NetworkResumeSessionLogResult,
  ): void => {
    logEvent(logScopes.NETWORK, {
      event: roomUseCaseLogEvents.RESUME_SESSION,
      result,
      socketId: deps.socketId,
    });
  };

  const result = await resumeSessionCoordinator({
    socketId: deps.socketId,
    sessionToken: deps.sessionToken,
    roomManager: deps.roomManager,
    runtimeRegistry: deps.runtimeRegistry,
    sessionReservations: deps.sessionReservations,
    identityRegistry: deps.identityRegistry,
    joinRoomChannel: deps.joinRoomChannel,
  });

  switch (result.status) {
    case "resumed":
      deps.output.publishSessionResumedToSocket({
        playerId: result.playerId,
        room: result.room,
      });
      logResumeSessionNotice(logResults.EMITTED);
      return;

    case "expired":
      deps.output.publishResumeSessionRejectedToSocket("expired");
      logResumeSessionNotice(logResults.REJECTED_SESSION_EXPIRED);
      return;

    case "game_ended":
      deps.output.publishResumeSessionRejectedToSocket("game_ended");
      logResumeSessionNotice(logResults.REJECTED_GAME_ENDED);
      return;

    default:
      return;
  }
};

/**
 * LEAVE_ROOMイベントを調停して明示退室を実行する
 * 明示退室のためBot置換は行わず，復帰予約と識別子の対応も破棄する
 */
export const handleLeaveRoomEvent = async (
  deps: LeaveRoomOrchestratorDeps,
): Promise<void> => {
  // 識別子の解放後は解決結果が変わるため，処理の先頭で確定させる
  const playerId = deps.playerId;
  const roomId = deps.roomManager.getRoomByPlayerId(playerId)?.roomId;

  roomDisconnectUseCase({
    roomManager: deps.roomManager,
    runtimeRegistry: deps.runtimeRegistry,
    socketId: playerId,
    output: deps.output,
  });

  if (deps.sessionToken) {
    deps.sessionReservations.releaseByToken(deps.sessionToken);
  }
  deps.identityRegistry.release(deps.socketId);

  if (!roomId) {
    // 所属ルームを引けない退室要求は配信先が無いためログのみ残す
    logEvent(logScopes.ROOM_USE_CASE, {
      event: roomUseCaseLogEvents.LEAVE_ROOM,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: playerId,
    });
    return;
  }

  // ソケットは接続したままなので，配信チャンネルからは明示的に退出させる
  await deps.leaveRoomChannel(roomId);
  logEvent(logScopes.ROOM_USE_CASE, {
    event: roomUseCaseLogEvents.LEAVE_ROOM,
    result: logResults.PROCESSED,
    socketId: playerId,
    roomId,
  });
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
