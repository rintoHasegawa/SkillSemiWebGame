/**
 * registerGameHandlers
 * ゲーム関連イベントの受信ハンドラを登録する
 */
import { Socket } from "socket.io";
import { protocol } from "@repo/shared";
import type {
  GameEventRoomUseCasePort,
  GameEventRuntimeUseCasePort,
} from "@server/network/types/connectionPorts";
import {
  isBombHitReportPayload,
  isMovePayload,
  isPingPayload,
  isPlaceBombPayload,
  isStartGamePayload,
} from "@server/network/validation/socketPayloadValidators";
import { createServerSocketOnBridge } from "@server/network/handlers/socketEventBridge";
import { createPayloadGuard } from "@server/network/handlers/payloadGuard";
import type { GameOutputAdapter } from "./createGameOutputAdapter";
import {
  handleBombHitReportEvent,
  type GameEventOrchestratorDeps,
  handleMoveEvent,
  handlePingEvent,
  handlePlaceBombEvent,
  handleReadyForGameEvent,
  handleStartGameEvent,
} from "./gameEventOrchestrators";

/** ゲーム受信イベントごとの入力検証関数を保持するテーブル */
const gamePayloadValidators = {
  [protocol.SocketEvents.PING]: isPingPayload,
  [protocol.SocketEvents.MOVE]: isMovePayload,
  [protocol.SocketEvents.PLACE_BOMB]: isPlaceBombPayload,
  [protocol.SocketEvents.BOMB_HIT_REPORT]: isBombHitReportPayload,
} as const;

/** 検証付きゲームイベント登録定義 */
type GuardedGameEventDefinition = {
  event: keyof typeof gamePayloadValidators;
  validator: (value: unknown) => value is unknown;
  orchestrate: (payload: unknown) => void;
};

/** 自前検証付きゲームイベント登録定義 */
type SelfValidatedGameEventDefinition = {
  event: typeof protocol.SocketEvents.START_GAME;
  validator: (value: unknown) => value is unknown;
  orchestrate: (payload: unknown) => void;
};

/** 検証不要ゲームイベント登録定義 */
type UnguardedGameEventDefinition = {
  event: typeof protocol.SocketEvents.READY_FOR_GAME;
  orchestrate: () => void;
};

/** ゲームイベント調停で利用する依存束を生成する */
const createGameOrchestratorDeps = (
  socket: Socket,
  roomManager: GameEventRoomUseCasePort,
  runtimeRegistry: GameEventRuntimeUseCasePort,
  gameOutputAdapter: GameOutputAdapter,
): GameEventOrchestratorDeps => {
  return {
    socketId: socket.id,
    roomManager,
    runtimeRegistry,
    output: gameOutputAdapter,
  };
};

/** ゲームイベントの購読とユースケース呼び出しを設定する */
export const registerGameHandlers = (
  socket: Socket,
  roomManager: GameEventRoomUseCasePort,
  runtimeRegistry: GameEventRuntimeUseCasePort,
  gameOutputAdapter: GameOutputAdapter,
) => {
  const orchestratorDeps = createGameOrchestratorDeps(
    socket,
    roomManager,
    runtimeRegistry,
    gameOutputAdapter,
  );
  const { onEvent } = createServerSocketOnBridge(socket);
  const { guardOnEvent } = createPayloadGuard(socket.id);

  // 検証が必要なイベントを宣言的に登録する
  const guardedGameEventDefinitions: GuardedGameEventDefinition[] = [
    {
      event: protocol.SocketEvents.PING,
      validator: gamePayloadValidators[protocol.SocketEvents.PING],
      orchestrate: (payload) => {
        handlePingEvent(orchestratorDeps, payload as Parameters<typeof handlePingEvent>[1]);
      },
    },
    {
      event: protocol.SocketEvents.MOVE,
      validator: gamePayloadValidators[protocol.SocketEvents.MOVE],
      orchestrate: (payload) => {
        handleMoveEvent(orchestratorDeps, payload as Parameters<typeof handleMoveEvent>[1]);
      },
    },
    {
      event: protocol.SocketEvents.PLACE_BOMB,
      validator: gamePayloadValidators[protocol.SocketEvents.PLACE_BOMB],
      orchestrate: (payload) => {
        handlePlaceBombEvent(orchestratorDeps, payload as Parameters<typeof handlePlaceBombEvent>[1]);
      },
    },
    {
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      validator: gamePayloadValidators[protocol.SocketEvents.BOMB_HIT_REPORT],
      orchestrate: (payload) => {
        handleBombHitReportEvent(orchestratorDeps, payload as Parameters<typeof handleBombHitReportEvent>[1]);
      },
    },
  ];

  guardedGameEventDefinitions.forEach((definition) => {
    const guard = guardOnEvent(definition.event, definition.validator);
    onEvent(definition.event, (payload) => {
      if (!guard(payload)) {
        return;
      }

      definition.orchestrate(payload);
    });
  });

  // payloadGuard対象外だが検証が必要なイベントを宣言的に登録する
  const selfValidatedGameEventDefinitions: SelfValidatedGameEventDefinition[] = [
    {
      event: protocol.SocketEvents.START_GAME,
      validator: isStartGamePayload,
      orchestrate: (payload) => {
        handleStartGameEvent(
          orchestratorDeps,
          payload as Parameters<typeof handleStartGameEvent>[1],
        );
      },
    },
  ];

  selfValidatedGameEventDefinitions.forEach((definition) => {
    onEvent(definition.event, (payload) => {
      if (!definition.validator(payload)) {
        return;
      }

      definition.orchestrate(payload);
    });
  });

  // 検証不要イベントを宣言的に登録する
  const unguardedGameEventDefinitions: UnguardedGameEventDefinition[] = [
    {
      event: protocol.SocketEvents.READY_FOR_GAME,
      orchestrate: () => {
        handleReadyForGameEvent(orchestratorDeps);
      },
    },
  ];

  unguardedGameEventDefinitions.forEach((definition) => {
    onEvent(definition.event, () => {
      definition.orchestrate();
    });
  });
};
