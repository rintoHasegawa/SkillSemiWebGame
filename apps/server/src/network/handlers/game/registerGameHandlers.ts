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
import {
  registerGuardedEvents,
  registerSelfValidatedEvents,
  registerUnguardedEvents,
  type GuardedEventDefinition,
  type SelfValidatedEventDefinition,
  type UnguardedEventDefinition,
} from "@server/network/handlers/eventDefinitionRegistrar";

type PingEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.PING,
  Parameters<typeof handlePingEvent>[1]
>;

type MoveEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.MOVE,
  Parameters<typeof handleMoveEvent>[1]
>;

type PlaceBombEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.PLACE_BOMB,
  Parameters<typeof handlePlaceBombEvent>[1]
>;

type BombHitReportEventDefinition = GuardedEventDefinition<
  typeof protocol.SocketEvents.BOMB_HIT_REPORT,
  Parameters<typeof handleBombHitReportEvent>[1]
>;

type StartGameEventDefinition = SelfValidatedEventDefinition<
  typeof protocol.SocketEvents.START_GAME,
  Parameters<typeof handleStartGameEvent>[1]
>;

/** ゲーム受信イベントごとの入力検証関数を保持するテーブル */
const gamePayloadValidators = {
  [protocol.SocketEvents.PING]: isPingPayload,
  [protocol.SocketEvents.MOVE]: isMovePayload,
  [protocol.SocketEvents.PLACE_BOMB]: isPlaceBombPayload,
  [protocol.SocketEvents.BOMB_HIT_REPORT]: isBombHitReportPayload,
} as const;

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
  const guardedGameEventDefinitions: Array<
    | PingEventDefinition
    | MoveEventDefinition
    | PlaceBombEventDefinition
    | BombHitReportEventDefinition
  > = [
    {
      event: protocol.SocketEvents.PING,
      validator: gamePayloadValidators[protocol.SocketEvents.PING],
      orchestrate: (payload) => {
        handlePingEvent(orchestratorDeps, payload);
      },
    },
    {
      event: protocol.SocketEvents.MOVE,
      validator: gamePayloadValidators[protocol.SocketEvents.MOVE],
      orchestrate: (payload) => {
        handleMoveEvent(orchestratorDeps, payload);
      },
    },
    {
      event: protocol.SocketEvents.PLACE_BOMB,
      validator: gamePayloadValidators[protocol.SocketEvents.PLACE_BOMB],
      orchestrate: (payload) => {
        handlePlaceBombEvent(orchestratorDeps, payload);
      },
    },
    {
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      validator: gamePayloadValidators[protocol.SocketEvents.BOMB_HIT_REPORT],
      orchestrate: (payload) => {
        handleBombHitReportEvent(orchestratorDeps, payload);
      },
    },
  ];

  registerGuardedEvents(onEvent, guardOnEvent, guardedGameEventDefinitions);

  // payloadGuard対象外だが検証が必要なイベントを宣言的に登録する
  const selfValidatedGameEventDefinitions: StartGameEventDefinition[] = [
    {
      event: protocol.SocketEvents.START_GAME,
      validator: isStartGamePayload,
      orchestrate: (payload) => {
        handleStartGameEvent(orchestratorDeps, payload);
      },
    },
  ];

  registerSelfValidatedEvents(onEvent, selfValidatedGameEventDefinitions);

  // 検証不要イベントを宣言的に登録する
  const unguardedGameEventDefinitions: UnguardedEventDefinition<typeof protocol.SocketEvents.READY_FOR_GAME>[] = [
    {
      event: protocol.SocketEvents.READY_FOR_GAME,
      orchestrate: () => {
        handleReadyForGameEvent(orchestratorDeps);
      },
    },
  ];

  registerUnguardedEvents(onEvent, unguardedGameEventDefinitions);
};
