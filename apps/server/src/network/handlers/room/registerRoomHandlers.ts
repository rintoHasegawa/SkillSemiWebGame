/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 * 明示退室（LEAVE_ROOM）と試合復帰（RESUME_SESSION）の受信も併せて登録する
 */
import { Socket } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
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
import {
  createCurrentPlayerIdResolver,
  type CurrentPlayerIdResolver,
  type PlayerIdentityRegistry,
  type SessionReservationRegistry,
} from "@server/network/identity";
import { toSocketRoomName } from "@server/network/adapters/socketEmitters";
import { createSocketRegistrationContext } from "@server/network/handlers/registration";
import {
  isJoinRoomPayload,
  isLobbySettingsUpdatePayload,
  isSelectTeamPayload,
} from "@server/network/validation/socketPayloadValidators";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";
import type { LobbySettingsUpdatePayload, SelectTeamPayload } from "@repo/shared";
import {
  handleJoinRoomEvent,
  handleLeaveRoomEvent,
  handleLobbySettingsUpdateEvent,
  handleResumeSessionEvent,
  handleSelectTeamEvent,
  type JoinRoomEventPayload,
  type JoinRoomOrchestratorDeps,
  type LeaveRoomOrchestratorDeps,
  type LobbySettingsUpdateOrchestratorDeps,
  type ResumeSessionOrchestratorDeps,
  type SelectTeamOrchestratorDeps,
} from "./roomEventOrchestrators";
import {
  registerGuardedEvent,
  registerUnguardedEvent,
  type GuardedEventDefinition,
  type UnguardedEventDefinition,
} from "@server/network/handlers/eventDefinitionRegistrar";

type RoomHandlerRoomUseCasePort =
  & JoinRoomEventRoomUseCasePort
  & LobbySettingsUpdateEventRoomUseCasePort
  & SelectTeamEventRoomUseCasePort
  & ResumeSessionEventRoomUseCasePort
  & LeaveRoomEventRoomUseCasePort;

type RoomHandlerRuntimeUseCasePort =
  & JoinRoomEventRuntimeUseCasePort
  & ResumeSessionEventRuntimeUseCasePort
  & LeaveRoomEventRuntimeUseCasePort;

/** ルームイベントハンドラ登録で受け取る入力パラメータ */
export type RegisterRoomHandlersParams = {
  socket: Socket;
  roomManager: RoomHandlerRoomUseCasePort;
  runtimeRegistry: RoomHandlerRuntimeUseCasePort;
  roomOutputAdapter: RoomOutputAdapter;
  identityRegistry: PlayerIdentityRegistry;
  sessionReservations: SessionReservationRegistry;
  /** ハンドシェイクで受け取ったセッショントークン（未提示は undefined） */
  sessionToken?: string;
};

type JoinRoomEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.JOIN_ROOM,
  JoinRoomEventPayload
>;

type LobbySettingsUpdateEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.LOBBY_SETTINGS_UPDATE,
  LobbySettingsUpdatePayload
>;

type SelectTeamEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.SELECT_TEAM,
  SelectTeamPayload
>;

type ResumeSessionEventDefinition = UnguardedEventDefinition<
  typeof protocol.SocketEvents.RESUME_SESSION
>;

type LeaveRoomEventDefinition = UnguardedEventDefinition<
  typeof protocol.SocketEvents.LEAVE_ROOM
>;

/** ルームイベント調停で利用する依存束を生成する */
const createJoinRoomOrchestratorDeps = (
  params: RegisterRoomHandlersParams,
  resolvePlayerId: CurrentPlayerIdResolver,
): JoinRoomOrchestratorDeps => {
  const { socket, roomManager, runtimeRegistry, roomOutputAdapter } = params;

  return {
    get socketId() {
      return resolvePlayerId();
    },
    roomManager,
    runtimeRegistry,
    output: roomOutputAdapter,
    joinRoom: async (roomId) => {
      // ルーム配信先（createEmitToRoom）と同じ変換で Socket.IO ルーム名を解決する
      await socket.join(toSocketRoomName(roomId));
    },
  };
};

/** ロビー設定更新イベント調停で利用する依存束を生成する */
const createLobbySettingsUpdateOrchestratorDeps = (
  params: RegisterRoomHandlersParams,
  resolvePlayerId: CurrentPlayerIdResolver,
): LobbySettingsUpdateOrchestratorDeps => {
  const { roomManager, roomOutputAdapter } = params;

  return {
    get socketId() {
      return resolvePlayerId();
    },
    roomManager,
    output: roomOutputAdapter,
  };
};

/** チーム選択イベント調停で利用する依存束を生成する */
const createSelectTeamOrchestratorDeps = (
  params: RegisterRoomHandlersParams,
  resolvePlayerId: CurrentPlayerIdResolver,
): SelectTeamOrchestratorDeps => {
  const { roomManager, roomOutputAdapter } = params;

  return {
    get socketId() {
      return resolvePlayerId();
    },
    roomManager,
    output: roomOutputAdapter,
  };
};

/** 試合復帰イベント調停で利用する依存束を生成する */
const createResumeSessionOrchestratorDeps = (
  params: RegisterRoomHandlersParams,
): ResumeSessionOrchestratorDeps => {
  const { socket, roomManager, runtimeRegistry, roomOutputAdapter } = params;

  return {
    // 復帰前のため，ここでは実ソケットIDをそのまま扱う
    socketId: socket.id,
    sessionToken: params.sessionToken,
    roomManager,
    runtimeRegistry,
    sessionReservations: params.sessionReservations,
    identityRegistry: params.identityRegistry,
    output: roomOutputAdapter,
    joinRoomChannel: async (roomId) => {
      await socket.join(toSocketRoomName(roomId));
    },
  };
};

/** 明示退室イベント調停で利用する依存束を生成する */
const createLeaveRoomOrchestratorDeps = (
  params: RegisterRoomHandlersParams,
  resolvePlayerId: CurrentPlayerIdResolver,
): LeaveRoomOrchestratorDeps => {
  const { socket, roomManager, runtimeRegistry, roomOutputAdapter } = params;

  return {
    get playerId() {
      return resolvePlayerId();
    },
    socketId: socket.id,
    sessionToken: params.sessionToken,
    roomManager,
    runtimeRegistry,
    sessionReservations: params.sessionReservations,
    identityRegistry: params.identityRegistry,
    output: roomOutputAdapter,
    leaveRoomChannel: async (roomId) => {
      await socket.leave(toSocketRoomName(roomId));
    },
  };
};

/** JOIN_ROOMイベント定義を生成する */
const createJoinRoomEventDefinition = (
  deps: JoinRoomOrchestratorDeps,
): JoinRoomEventDefinition => {
  return {
    event: protocol.SocketEvents.JOIN_ROOM,
    validator: isJoinRoomPayload,
    orchestrate: async (payload) => {
      await handleJoinRoomEvent(deps, payload);
    },
    onInvalid: () => {
      // 受信した未検証の値をそのまま返さない（巨大文字列のエコーバックを避ける）ため
      // roomId は空文字とする
      deps.output.publishJoinRejectedToSocket({
        roomId: "",
        reason: "invalid",
      });

      // payloadGuard の ignored_invalid_payload は「処理せず破棄した」記録であり，
      // 本ログは「クライアントへ拒否を通知した」記録として役割が異なる
      logEvent(logScopes.NETWORK, {
        event: roomUseCaseLogEvents.JOIN_ROOM,
        result: logResults.REJECTED_INVALID_PAYLOAD,
        socketId: deps.socketId,
      });
    },
  };
};

/** LOBBY_SETTINGS_UPDATEイベント定義を生成する */
const createLobbySettingsUpdateEventDefinition = (
  deps: LobbySettingsUpdateOrchestratorDeps,
): LobbySettingsUpdateEventDefinition => {
  return {
    event: protocol.SocketEvents.LOBBY_SETTINGS_UPDATE,
    validator: isLobbySettingsUpdatePayload,
    orchestrate: (payload) => {
      handleLobbySettingsUpdateEvent(deps, payload);
    },
  };
};

/** SELECT_TEAMイベント定義を生成する */
const createSelectTeamEventDefinition = (
  deps: SelectTeamOrchestratorDeps,
): SelectTeamEventDefinition => {
  return {
    event: protocol.SocketEvents.SELECT_TEAM,
    validator: isSelectTeamPayload,
    orchestrate: (payload) => {
      handleSelectTeamEvent(deps, payload);
    },
  };
};

/** RESUME_SESSIONイベント定義を生成する */
const createResumeSessionEventDefinition = (
  deps: ResumeSessionOrchestratorDeps,
): ResumeSessionEventDefinition => {
  return {
    event: protocol.SocketEvents.RESUME_SESSION,
    orchestrate: async () => {
      await handleResumeSessionEvent(deps);
    },
  };
};

/** LEAVE_ROOMイベント定義を生成する */
const createLeaveRoomEventDefinition = (
  deps: LeaveRoomOrchestratorDeps,
): LeaveRoomEventDefinition => {
  return {
    event: protocol.SocketEvents.LEAVE_ROOM,
    orchestrate: async () => {
      await handleLeaveRoomEvent(deps);
    },
  };
};

/** ルーム関連イベントを検証してユースケースへ連携する */
export const registerRoomHandlers = (params: RegisterRoomHandlersParams) => {
  // ハンドラ登録は接続時の一度きりなので，プレイヤーIDは固定値にせず都度解決する
  const resolvePlayerId = createCurrentPlayerIdResolver(
    params.identityRegistry,
    params.socket,
  );
  const { onEvent, guardOnEvent } = createSocketRegistrationContext(
    params.socket,
    resolvePlayerId,
  );

  const joinRoomDeps = createJoinRoomOrchestratorDeps(params, resolvePlayerId);
  const lobbySettingsDeps = createLobbySettingsUpdateOrchestratorDeps(
    params,
    resolvePlayerId,
  );
  const selectTeamDeps = createSelectTeamOrchestratorDeps(
    params,
    resolvePlayerId,
  );
  const resumeSessionDeps = createResumeSessionOrchestratorDeps(params);
  const leaveRoomDeps = createLeaveRoomOrchestratorDeps(
    params,
    resolvePlayerId,
  );

  registerGuardedEvent(onEvent, guardOnEvent, createJoinRoomEventDefinition(joinRoomDeps));
  registerGuardedEvent(onEvent, guardOnEvent, createLobbySettingsUpdateEventDefinition(lobbySettingsDeps));
  registerGuardedEvent(onEvent, guardOnEvent, createSelectTeamEventDefinition(selectTeamDeps));

  // ペイロードを持たないイベントは検証不要として登録する
  registerUnguardedEvent(onEvent, createResumeSessionEventDefinition(resumeSessionDeps));
  registerUnguardedEvent(onEvent, createLeaveRoomEventDefinition(leaveRoomDeps));
};
