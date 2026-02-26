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

/** ルーム受信イベントごとの入力検証関数を保持するテーブル */
const roomPayloadValidators = {
  [protocol.SocketEvents.JOIN_ROOM]: isJoinRoomPayload,
} as const;

/** 検証付きルームイベント登録定義 */
type GuardedRoomEventDefinition = {
  event: keyof typeof roomPayloadValidators;
  validator: (value: unknown) => value is unknown;
  orchestrate: (payload: unknown) => Promise<void>;
};

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
  const guardedRoomEventDefinitions: GuardedRoomEventDefinition[] = [
    {
      event: protocol.SocketEvents.JOIN_ROOM,
      validator: roomPayloadValidators[protocol.SocketEvents.JOIN_ROOM],
      orchestrate: async (payload) => {
        await handleJoinRoomEvent(
          orchestratorDeps,
          payload as Parameters<typeof handleJoinRoomEvent>[1],
        );
      },
    },
  ];

  guardedRoomEventDefinitions.forEach((definition) => {
    const guard = guardOnEvent(definition.event, definition.validator);
    onEvent(definition.event, async (payload) => {
      if (!guard(payload)) {
        return;
      }

      await definition.orchestrate(payload);
    });
  });
};
