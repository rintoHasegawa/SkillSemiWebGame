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

/** 検証付きで登録するゲーム受信イベント名 */
type GuardedGameEventName = keyof typeof gamePayloadValidators;

/** 受信イベント登録で共有するコンテキスト */
type SocketRegistrationContext = ReturnType<
  typeof createSocketRegistrationContext
>;

/** 検証付きゲームイベント1件を購読へ結び付ける処理 */
type GuardedGameEventRegistrar = (
  context: SocketRegistrationContext,
  deps: GameEventOrchestratorDeps,
) => void;

/**
 * 検証付きゲームイベントの登録処理を生成する
 * 4イベントで差分となるイベント名・入力検証・委譲先ハンドラのみを受け取る
 */
const defineGuardedGameEvent = <TEvent extends GuardedGameEventName, TPayload>(
  event: TEvent,
  validator: (value: unknown) => value is TPayload,
  handle: (deps: GameEventOrchestratorDeps, payload: TPayload) => void,
): GuardedGameEventRegistrar => {
  return ({ onEvent, guardOnEvent }, deps) => {
    const definition: GuardedEventDefinition<TEvent, TPayload> = {
      event,
      validator,
      orchestrate: (payload) => {
        handle(deps, payload);
      },
    };

    registerGuardedEvent(onEvent, guardOnEvent, definition);
  };
};

/** 検証付きゲームイベントの登録処理テーブル（イベント名と検証・委譲先の対応） */
const guardedGameEventRegistrars: readonly GuardedGameEventRegistrar[] = [
  defineGuardedGameEvent(
    protocol.SocketEvents.PING,
    gamePayloadValidators[protocol.SocketEvents.PING],
    handlePingEvent,
  ),
  defineGuardedGameEvent(
    protocol.SocketEvents.MOVE,
    gamePayloadValidators[protocol.SocketEvents.MOVE],
    handleMoveEvent,
  ),
  defineGuardedGameEvent(
    protocol.SocketEvents.PLACE_BOMB,
    gamePayloadValidators[protocol.SocketEvents.PLACE_BOMB],
    handlePlaceBombEvent,
  ),
  defineGuardedGameEvent(
    protocol.SocketEvents.BOMB_HIT_REPORT,
    gamePayloadValidators[protocol.SocketEvents.BOMB_HIT_REPORT],
    handleBombHitReportEvent,
  ),
];

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
  const registrationContext = createSocketRegistrationContext(
    params.socket,
    resolvePlayerId,
  );
  const { onEvent } = registrationContext;

  // 検証が必要なイベントはテーブルの対応に従って一括登録する
  for (const registerGuardedGameEvent of guardedGameEventRegistrars) {
    registerGuardedGameEvent(registrationContext, orchestratorDeps);
  }

  // payloadGuard対象外だが検証が必要なイベントを宣言的に登録する
  const startGameEventDefinition = createStartGameEventDefinition(orchestratorDeps);

  registerSelfValidatedEvent(onEvent, startGameEventDefinition);

  // 検証不要イベントを宣言的に登録する
  const readyForGameEventDefinition: ReadyForGameEventDefinition =
    createReadyForGameEventDefinition(orchestratorDeps);

  registerUnguardedEvent(onEvent, readyForGameEventDefinition);
};
