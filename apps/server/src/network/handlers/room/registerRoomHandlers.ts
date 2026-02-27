/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 */
import { Socket } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import type {
  JoinRoomEventRoomUseCasePort,
  JoinRoomEventRuntimeUseCasePort,
} from "@server/network/types/connectionPorts";
import { createSocketRegistrationContext } from "@server/network/handlers/registration";
import { isJoinRoomPayload } from "@server/network/validation/socketPayloadValidators";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";
import {
  handleJoinRoomEvent,
  type JoinRoomEventPayload,
  type JoinRoomOrchestratorDeps,
} from "./roomEventOrchestrators";
import {
  registerGuardedEvent,
  type GuardedEventDefinition,
} from "@server/network/handlers/eventDefinitionRegistrar";

type JoinRoomEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.JOIN_ROOM,
  JoinRoomEventPayload
>;

/** ルーム受信イベントごとの入力検証関数を保持するテーブル */
const roomPayloadValidators = {
  [protocol.SocketEvents.JOIN_ROOM]: isJoinRoomPayload,
} as const;

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

/** JOIN_ROOMイベント定義を生成する */
const createJoinRoomEventDefinition = (
  deps: JoinRoomOrchestratorDeps,
): JoinRoomEventDefinition => {
  return {
    event: protocol.SocketEvents.JOIN_ROOM,
    validator: roomPayloadValidators[protocol.SocketEvents.JOIN_ROOM],
    orchestrate: async (payload) => {
      await handleJoinRoomEvent(deps, payload);
    },
  };
};

/** ルーム参加イベントを検証して参加ユースケースへ連携する */
export const registerRoomHandlers = (
  socket: Socket,
  roomManager: JoinRoomEventRoomUseCasePort,
  runtimeRegistry: JoinRoomEventRuntimeUseCasePort,
  roomOutputAdapter: RoomOutputAdapter,
) => {
  const orchestratorDeps = createJoinRoomOrchestratorDeps(
    socket,
    roomManager,
    runtimeRegistry,
    roomOutputAdapter,
  );
  const { onEvent, guardOnEvent } = createSocketRegistrationContext(socket);

  // 検証が必要なイベントを宣言的に登録する
  const joinRoomEventDefinition = createJoinRoomEventDefinition(
    orchestratorDeps,
  );

  registerGuardedEvent(onEvent, guardOnEvent, joinRoomEventDefinition);
};
