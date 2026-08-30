/**
 * gameEventOrchestrators
 * ゲーム受信イベントごとの調停処理を提供する
 * 受信ハンドラからユースケース実行責務を分離する
 * ランタイム未解決時はNetworkスコープでignored_missing_roomを記録する
 */
import { contracts as protocol, domain, type BombHitReportPayload, type PingPayload, type PlaceBombPayload, type StartGameRequestPayload } from "@repo/shared";
import { readyForGameCoordinator } from "@server/application/coordinators/readyForGameCoordinator";
import { startGameCoordinator } from "@server/application/coordinators/startGameCoordinator";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { placeBombUseCase } from "@server/domains/game/application/useCases/placeBombUseCase";
import { reportBombHitUseCase } from "@server/domains/game/application/useCases/reportBombHitUseCase";
import type { BombHitReportDecision } from "@server/domains/game/application/useCases/reportBombHitValidation";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { runWithRuntimeByPlayerId } from "@server/domains/room/application/services/RoomRuntimeResolver";
import type { RoomOutputPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { logIgnoredMissingRoom } from "../orchestratorEventLogger";
import type { GameOutputAdapter } from "./createGameOutputAdapter";
import type {
  GameEventRoomUseCasePort,
  GameEventRuntimeUseCasePort,
} from "@server/network/types/connectionPorts";
import type { SessionReservationRegistry } from "@server/network/identity";

/** START_GAMEイベントの入力ペイロード型 */
export type StartGamePayload = StartGameRequestPayload;

/** ゲームイベント調停で利用する依存集合 */
export type GameEventOrchestratorDeps = {
  /**
   * ゲームセッション上の識別子
   * 復帰済みソケットでは実ソケットIDと異なるため，参照のたびに解決される
   */
  socketId: string;
  roomManager: GameEventRoomUseCasePort;
  runtimeRegistry: GameEventRuntimeUseCasePort;
  output: GameOutputAdapter;
  /** ルーム状態の変化をROOM_UPDATEで配信するための出力 */
  roomOutput: Pick<
    RoomOutputPort,
    "publishRoomUpdateToRoom" | "closeRoomChannel"
  >;
  /** 試合終了時に復帰予約を解放するためのレジストリ */
  sessionReservations: Pick<SessionReservationRegistry, "releaseByRoomId">;
};

/** PINGイベントを調停してPONG返却ユースケースを実行する */
export const handlePingEvent = (
  deps: GameEventOrchestratorDeps,
  clientTime: PingPayload,
): void => {
  // ゲーム時計はセッションが持つため，プレイヤー所属ルームのランタイム経由で解決する
  const resolved = runWithRuntimeByPlayerId(
    deps.roomManager,
    deps.runtimeRegistry,
    deps.socketId,
    ({ gameManager }) => {
      pingUseCase({
        socketId: deps.socketId,
        clientTime,
        gameClock: gameManager,
        output: deps.output,
      });
    },
  );
  if (!resolved) {
    logIgnoredMissingRoom(protocol.SocketEvents.PING, deps.socketId);
  }
};

/** START_GAMEイベントを調停してゲーム開始ユースケースを起動する */
export const handleStartGameEvent = (
  deps: GameEventOrchestratorDeps,
  payload: StartGamePayload,
): void => {
  startGameCoordinator({
    ownerId: deps.socketId,
    requestedPlayerCount: payload.targetPlayerCount,
    requestedFieldSizePreset: payload.fieldSizePreset,
    roomManager: deps.roomManager,
    runtimeRegistry: deps.runtimeRegistry,
    output: deps.output,
    roomOutput: deps.roomOutput,
    sessionReservations: deps.sessionReservations,
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
  move: domain.game.player.MovePayload,
): void => {
  const normalizedMove = domain.game.player.quantizeMovePayload(move);
  const resolved = runWithRuntimeByPlayerId(
    deps.roomManager,
    deps.runtimeRegistry,
    deps.socketId,
    ({ gameManager }) => {
      movePlayerUseCase({
        gameManager,
        playerId: deps.socketId,
        move: normalizedMove,
      });
    },
  );
  if (!resolved) {
    logIgnoredMissingRoom(protocol.SocketEvents.MOVE, deps.socketId);
  }
};

/** PLACE_BOMBイベントを調停して爆弾設置ユースケースを実行する */
export const handlePlaceBombEvent = (
  deps: GameEventOrchestratorDeps,
  payload: PlaceBombPayload,
): void => {
  const resolved = runWithRuntimeByPlayerId(
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
        },
        output: deps.output,
      });
    },
  );
  if (!resolved) {
    logIgnoredMissingRoom(protocol.SocketEvents.PLACE_BOMB, deps.socketId);
  }
};

/** 被弾報告の拒否理由に対応するログ結果値 */
type BombHitReportRejectedLogResult =
  | typeof logResults.IGNORED_UNKNOWN_BOMB
  | typeof logResults.IGNORED_EXPIRED_BOMB
  | typeof logResults.IGNORED_OUT_OF_RANGE
  | typeof logResults.IGNORED_SAME_TEAM
  | typeof logResults.IGNORED_DUPLICATE;

// 被弾報告の判定結果をログ結果値へ対応づける（受理は記録対象外）
const resolveBombHitReportLogResult = (
  decision: BombHitReportDecision,
): BombHitReportRejectedLogResult | undefined => {
  switch (decision.status) {
    case "accepted":
      // 高頻度イベントの正常系はログに残さない
      return undefined;
    case "unknown_bomb":
      return logResults.IGNORED_UNKNOWN_BOMB;
    case "expired":
      return logResults.IGNORED_EXPIRED_BOMB;
    case "too_far":
      return logResults.IGNORED_OUT_OF_RANGE;
    case "same_team":
      return logResults.IGNORED_SAME_TEAM;
    case "duplicate":
      return logResults.IGNORED_DUPLICATE;
  }
};

/**
 * BOMB_HIT_REPORTイベントを調停して被弾報告ユースケースを実行する
 * 拒否した報告はサーバーログのみに残し，高頻度イベントのためクライアントへは通知しない
 */
export const handleBombHitReportEvent = (
  deps: GameEventOrchestratorDeps,
  payload: BombHitReportPayload,
): void => {
  const resolved = runWithRuntimeByPlayerId(
    deps.roomManager,
    deps.runtimeRegistry,
    deps.socketId,
    ({ roomId, gameManager }) => {
      const decision = reportBombHitUseCase({
        roomId,
        validation: gameManager,
        stats: gameManager,
        input: {
          socketId: deps.socketId,
          payload,
        },
        output: deps.output,
      });

      const result = resolveBombHitReportLogResult(decision);
      if (result) {
        logEvent(logScopes.GAME_USE_CASE, {
          event: gameUseCaseLogEvents.BOMB_HIT_REPORT,
          result,
          socketId: deps.socketId,
          roomId,
        });
      }
    },
  );
  if (!resolved) {
    logIgnoredMissingRoom(protocol.SocketEvents.BOMB_HIT_REPORT, deps.socketId);
  }
};
