/**
 * registerGameHandlers
 * ゲーム関連イベントの受信ハンドラを登録する
 */
import { Socket } from "socket.io";
import { contracts as protocol } from "@repo/shared";
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
import type { RoomOutputPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  createCurrentPlayerIdResolver,
  type CurrentPlayerIdResolver,
  type PlayerIdentityRegistry,
  type SessionReservationRegistry,
} from "@server/network/identity";
import { createSocketRegistrationContext } from "@server/network/handlers/registration";
import type { GameOutputAdapter } from "./createGameOutputAdapter";
import {
  type BombHitReportEventPayload,
  type MoveEventPayload,
  type PingEventPayload,
  type PlaceBombEventPayload,
  handleBombHitReportEvent,
  type GameEventOrchestratorDeps,
  handleMoveEvent,
  handlePingEvent,
  handlePlaceBombEvent,
  handleReadyForGameEvent,
  type StartGamePayload,
  handleStartGameEvent,
} from "./gameEventOrchestrators";
import {
  registerGuardedEvent,
  registerSelfValidatedEvent,
  registerUnguardedEvent,
  type GuardedEventDefinition,
  type SelfValidatedEventDefinition,
  type UnguardedEventDefinition,
} from "@server/network/handlers/eventDefinitionRegistrar";

type PingEventDefinition = GuardedEventDefinition<typeof protocol.SocketEvents.PING, PingEventPayload>;

type MoveEventDefinition = GuardedEventDefinition<typeof protocol.SocketEvents.MOVE, MoveEventPayload>;

type PlaceBombEventDefinition = GuardedEventDefinition<typeof protocol.SocketEvents.PLACE_BOMB, PlaceBombEventPayload>;

type BombHitReportEventDefinition = GuardedEventDefinition<typeof protocol.SocketEvents.BOMB_HIT_REPORT, BombHitReportEventPayload>;

type StartGameEventDefinition = SelfValidatedEventDefinition<typeof protocol.SocketEvents.START_GAME, StartGamePayload>;

type ReadyForGameEventDefinition = UnguardedEventDefinition<
  typeof protocol.SocketEvents.READY_FOR_GAME
>;

/** ゲーム受信イベントごとの入力検証関数を保持するテーブル */
const gamePayloadValidators = {
  [protocol.SocketEvents.PING]: isPingPayload,
  [protocol.SocketEvents.MOVE]: isMovePayload,
  [protocol.SocketEvents.PLACE_BOMB]: isPlaceBombPayload,
  [protocol.SocketEvents.BOMB_HIT_REPORT]: isBombHitReportPayload,
} as const;

/** ゲームイベントハンドラ登録で受け取る入力パラメータ */
export type RegisterGameHandlersParams = {
  socket: Socket;
  roomManager: GameEventRoomUseCasePort;
  runtimeRegistry: GameEventRuntimeUseCasePort;
  gameOutputAdapter: GameOutputAdapter;
  roomOutputAdapter: Pick<
    RoomOutputPort,
    "publishRoomUpdateToRoom" | "closeRoomChannel"
  >;
  identityRegistry: PlayerIdentityRegistry;
  sessionReservations: Pick<SessionReservationRegistry, "releaseByRoomId">;
};

/** ゲームイベント調停で利用する依存束を生成する */
const createGameOrchestratorDeps = (
  params: RegisterGameHandlersParams,
  resolvePlayerId: CurrentPlayerIdResolver,
): GameEventOrchestratorDeps => {
  const { roomManager, runtimeRegistry, gameOutputAdapter, roomOutputAdapter } = params;

  return {
    get socketId() {
      return resolvePlayerId();
    },
    roomManager,
    runtimeRegistry,
    output: gameOutputAdapter,
    roomOutput: roomOutputAdapter,
    sessionReservations: params.sessionReservations,
  };
};

/** PINGイベント定義を生成する */
const createPingEventDefinition = (
  deps: GameEventOrchestratorDeps,
): PingEventDefinition => {
  return {
    event: protocol.SocketEvents.PING,
    validator: gamePayloadValidators[protocol.SocketEvents.PING],
    orchestrate: (payload) => {
      handlePingEvent(deps, payload);
    },
  };
};

/** MOVEイベント定義を生成する */
const createMoveEventDefinition = (
  deps: GameEventOrchestratorDeps,
): MoveEventDefinition => {
  return {
    event: protocol.SocketEvents.MOVE,
    validator: gamePayloadValidators[protocol.SocketEvents.MOVE],
    orchestrate: (payload) => {
      handleMoveEvent(deps, payload);
    },
  };
};

/** PLACE_BOMBイベント定義を生成する */
const createPlaceBombEventDefinition = (
  deps: GameEventOrchestratorDeps,
): PlaceBombEventDefinition => {
  return {
    event: protocol.SocketEvents.PLACE_BOMB,
    validator: gamePayloadValidators[protocol.SocketEvents.PLACE_BOMB],
    orchestrate: (payload) => {
      handlePlaceBombEvent(deps, payload);
    },
  };
};

/** BOMB_HIT_REPORTイベント定義を生成する */
const createBombHitReportEventDefinition = (
  deps: GameEventOrchestratorDeps,
): BombHitReportEventDefinition => {
  return {
    event: protocol.SocketEvents.BOMB_HIT_REPORT,
    validator: gamePayloadValidators[protocol.SocketEvents.BOMB_HIT_REPORT],
    orchestrate: (payload) => {
      handleBombHitReportEvent(deps, payload);
    },
  };
};

/** START_GAMEイベント定義を生成する */
const createStartGameEventDefinition = (
  deps: GameEventOrchestratorDeps,
): StartGameEventDefinition => {
  return {
    event: protocol.SocketEvents.START_GAME,
    validator: isStartGamePayload,
    orchestrate: (payload) => {
      handleStartGameEvent(deps, payload);
    },
  };
};

/** READY_FOR_GAMEイベント定義を生成する */
const createReadyForGameEventDefinition = (
  deps: GameEventOrchestratorDeps,
): ReadyForGameEventDefinition => {
  return {
    event: protocol.SocketEvents.READY_FOR_GAME,
    orchestrate: () => {
      handleReadyForGameEvent(deps);
    },
  };
};

/** ゲームイベントの購読とユースケース呼び出しを設定する */
export const registerGameHandlers = (params: RegisterGameHandlersParams) => {
  // ハンドラ登録は接続時の一度きりなので，プレイヤーIDは固定値にせず都度解決する
  const resolvePlayerId = createCurrentPlayerIdResolver(
    params.identityRegistry,
    params.socket,
  );
  const orchestratorDeps = createGameOrchestratorDeps(params, resolvePlayerId);
  const { onEvent, guardOnEvent } = createSocketRegistrationContext(
    params.socket,
    resolvePlayerId,
  );

  // 検証が必要なイベントを宣言的に登録する
  const pingEventDefinition = createPingEventDefinition(orchestratorDeps);
  const moveEventDefinition = createMoveEventDefinition(orchestratorDeps);
  const placeBombEventDefinition = createPlaceBombEventDefinition(orchestratorDeps);
  const bombHitReportEventDefinition = createBombHitReportEventDefinition(orchestratorDeps);

  registerGuardedEvent(onEvent, guardOnEvent, pingEventDefinition);
  registerGuardedEvent(onEvent, guardOnEvent, moveEventDefinition);
  registerGuardedEvent(onEvent, guardOnEvent, placeBombEventDefinition);
  registerGuardedEvent(onEvent, guardOnEvent, bombHitReportEventDefinition);

  // payloadGuard対象外だが検証が必要なイベントを宣言的に登録する
  const startGameEventDefinition = createStartGameEventDefinition(orchestratorDeps);

  registerSelfValidatedEvent(onEvent, startGameEventDefinition);

  // 検証不要イベントを宣言的に登録する
  const readyForGameEventDefinition: ReadyForGameEventDefinition =
    createReadyForGameEventDefinition(orchestratorDeps);

  registerUnguardedEvent(onEvent, readyForGameEventDefinition);
};
