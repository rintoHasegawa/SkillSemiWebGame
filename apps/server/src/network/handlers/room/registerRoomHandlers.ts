/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 */
import { Socket } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import type {
  JoinRoomEventRoomUseCasePort,
  JoinRoomEventRuntimeUseCasePort,
  LobbySettingsUpdateEventRoomUseCasePort,
  SelectTeamEventRoomUseCasePort,
} from "@server/network/types/connectionPorts";
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
  handleLobbySettingsUpdateEvent,
  handleSelectTeamEvent,
  type JoinRoomEventPayload,
  type JoinRoomOrchestratorDeps,
  type LobbySettingsUpdateOrchestratorDeps,
  type SelectTeamOrchestratorDeps,
} from "./roomEventOrchestrators";
import {
  registerGuardedEvent,
  type GuardedEventDefinition,
} from "@server/network/handlers/eventDefinitionRegistrar";

type RoomHandlerRoomUseCasePort =
  & JoinRoomEventRoomUseCasePort
  & LobbySettingsUpdateEventRoomUseCasePort
  & SelectTeamEventRoomUseCasePort;

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

/** ルームイベント調停で利用する依存束を生成する */
const createJoinRoomOrchestratorDeps = (
  socket: Socket,
  roomManager: JoinRoomEventRoomUseCasePort,
  runtimeRegistry: JoinRoomEventRuntimeUseCasePort,
  roomOutputAdapter: RoomOutputAdapter,
): JoinRoomOrchestratorDeps => {
  return {
    socketId: socket.id,
    roomManager,
    runtimeRegistry,
    output: roomOutputAdapter,
    joinRoom: async (roomId) => {
      await socket.join(roomId);
    },
  };
};

/** ロビー設定更新イベント調停で利用する依存束を生成する */
const createLobbySettingsUpdateOrchestratorDeps = (
  socket: Socket,
  roomManager: LobbySettingsUpdateEventRoomUseCasePort,
  roomOutputAdapter: RoomOutputAdapter,
): LobbySettingsUpdateOrchestratorDeps => {
  return {
    socketId: socket.id,
    roomManager,
    output: roomOutputAdapter,
  };
};

/** チーム選択イベント調停で利用する依存束を生成する */
const createSelectTeamOrchestratorDeps = (
  socket: Socket,
  roomManager: SelectTeamEventRoomUseCasePort,
  roomOutputAdapter: RoomOutputAdapter,
): SelectTeamOrchestratorDeps => {
  return {
    socketId: socket.id,
    roomManager,
    output: roomOutputAdapter,
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

/** ルーム関連イベントを検証してユースケースへ連携する */
export const registerRoomHandlers = (
  socket: Socket,
  roomManager: RoomHandlerRoomUseCasePort,
  runtimeRegistry: JoinRoomEventRuntimeUseCasePort,
  roomOutputAdapter: RoomOutputAdapter,
) => {
  const { onEvent, guardOnEvent } = createSocketRegistrationContext(socket);

  const joinRoomDeps = createJoinRoomOrchestratorDeps(
    socket,
    roomManager,
    runtimeRegistry,
    roomOutputAdapter,
  );
  const lobbySettingsDeps = createLobbySettingsUpdateOrchestratorDeps(
    socket,
    roomManager,
    roomOutputAdapter,
  );
  const selectTeamDeps = createSelectTeamOrchestratorDeps(
    socket,
    roomManager,
    roomOutputAdapter,
  );

  registerGuardedEvent(onEvent, guardOnEvent, createJoinRoomEventDefinition(joinRoomDeps));
  registerGuardedEvent(onEvent, guardOnEvent, createLobbySettingsUpdateEventDefinition(lobbySettingsDeps));
  registerGuardedEvent(onEvent, guardOnEvent, createSelectTeamEventDefinition(selectTeamDeps));
};
