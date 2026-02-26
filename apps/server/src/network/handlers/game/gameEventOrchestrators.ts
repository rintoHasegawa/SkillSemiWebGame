/**
 * gameEventOrchestrators
 * ゲーム受信イベントごとの調停処理を提供する
 * 受信ハンドラからユースケース実行責務を分離する
 */
import { protocol, type BombHitReportPayload, type PingPayload, type PlaceBombPayload, type playerTypes } from "@repo/shared";
import { readyForGameCoordinator } from "@server/application/coordinators/readyForGameCoordinator";
import { startGameCoordinator } from "@server/application/coordinators/startGameCoordinator";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { placeBombUseCase } from "@server/domains/game/application/useCases/placeBombUseCase";
import { reportBombHitUseCase } from "@server/domains/game/application/useCases/reportBombHitUseCase";
import { runWithRuntimeByPlayerId } from "@server/domains/room/application/services/RoomRuntimeResolver";
import type { GameOutputAdapter } from "./createGameOutputAdapter";
import type {
  GameHandlerRoomPort,
  GameHandlerRuntimePort,
} from "@server/network/types/connectionPorts";

/** START_GAMEイベントの入力ペイロード型 */
export type StartGamePayload = {
  targetPlayerCount?: number;
};

/** ゲームイベント調停で利用する依存集合 */
export type GameEventOrchestratorDeps = {
  socketId: string;
  roomManager: GameHandlerRoomPort;
  runtimeRegistry: GameHandlerRuntimePort;
  output: GameOutputAdapter;
};

/** PINGイベントを調停してPONG返却ユースケースを実行する */
export const handlePingEvent = (
  deps: GameEventOrchestratorDeps,
  clientTime: PingPayload,
): void => {
  pingUseCase({
    clientTime,
    output: deps.output,
  });
};

/** START_GAMEイベントを調停してゲーム開始ユースケースを起動する */
export const handleStartGameEvent = (
  deps: GameEventOrchestratorDeps,
  payload: StartGamePayload,
): void => {
  startGameCoordinator({
    ownerId: deps.socketId,
    requestedPlayerCount: payload.targetPlayerCount,
    roomManager: deps.roomManager,
    runtimeRegistry: deps.runtimeRegistry,
    output: deps.output,
  });
};

/** READY_FOR_GAMEイベントを調停して準備状態通知ユースケースを実行する */
export const handleReadyForGameEvent = (
  deps: GameEventOrchestratorDeps,
): void => {
  readyForGameCoordinator({
    socketId: deps.socketId,
    roomManager: deps.roomManager,
    runtimeRegistry: deps.runtimeRegistry,
    output: deps.output,
  });
};

/** MOVEイベントを調停して移動ユースケースを実行する */
export const handleMoveEvent = (
  deps: GameEventOrchestratorDeps,
  move: playerTypes.MovePayload,
): void => {
  runWithRuntimeByPlayerId(
    deps.roomManager,
    deps.runtimeRegistry,
    deps.socketId,
    ({ gameManager }) => {
      movePlayerUseCase({
        gameManager,
        playerId: deps.socketId,
        move,
      });
    },
  );
};

/** PLACE_BOMBイベントを調停して爆弾設置ユースケースを実行する */
export const handlePlaceBombEvent = (
  deps: GameEventOrchestratorDeps,
  payload: PlaceBombPayload,
): void => {
  runWithRuntimeByPlayerId(
    deps.roomManager,
    deps.runtimeRegistry,
    deps.socketId,
    ({ roomId, gameManager }) => {
      placeBombUseCase({
        roomId,
        bombStore: gameManager,
        input: {
          socketId: deps.socketId,
          payload,
          nowMs: Date.now(),
        },
        output: deps.output,
      });
    },
  );
};

/** BOMB_HIT_REPORTイベントを調停して被弾報告ユースケースを実行する */
export const handleBombHitReportEvent = (
  deps: GameEventOrchestratorDeps,
  payload: BombHitReportPayload,
): void => {
  runWithRuntimeByPlayerId(
    deps.roomManager,
    deps.runtimeRegistry,
    deps.socketId,
    ({ roomId, gameManager }) => {
      reportBombHitUseCase({
        roomId,
        validation: gameManager,
        input: {
          socketId: deps.socketId,
          payload,
          nowMs: Date.now(),
        },
        output: deps.output,
      });
    },
  );
};
