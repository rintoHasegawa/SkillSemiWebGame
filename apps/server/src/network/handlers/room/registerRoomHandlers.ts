/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 */
import { Socket } from "socket.io";
import { protocol } from "@repo/shared";
import type {
  JoinRoomEventRoomUseCasePort,
  JoinRoomEventRuntimeUseCasePort,
} from "@server/network/types/connectionPorts";
import { createPayloadGuard } from "@server/network/handlers/payloadGuard";
import { createServerSocketOnBridge } from "@server/network/handlers/socketEventBridge";
import { isJoinRoomPayload } from "@server/network/validation/socketPayloadValidators";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";
import {
  handleJoinRoomEvent,
  type JoinRoomOrchestratorDeps,
} from "./roomEventOrchestrators";
import {
  registerGuardedEvents,
  type GuardedEventDefinition,
} from "@server/network/handlers/eventDefinitionRegistrar";

type JoinRoomEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.JOIN_ROOM,
  Parameters<typeof handleJoinRoomEvent>[1]
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
  const { onEvent } = createServerSocketOnBridge(socket);
  const { guardOnEvent } = createPayloadGuard(socket.id);

  // 検証が必要なイベントを宣言的に登録する
  const guardedRoomEventDefinitions: JoinRoomEventDefinition[] = [
    {
      event: protocol.SocketEvents.JOIN_ROOM,
      validator: roomPayloadValidators[protocol.SocketEvents.JOIN_ROOM],
      orchestrate: async (payload) => {
        await handleJoinRoomEvent(orchestratorDeps, payload);
      },
    },
  ];

  registerGuardedEvents(onEvent, guardOnEvent, guardedRoomEventDefinitions);
};
