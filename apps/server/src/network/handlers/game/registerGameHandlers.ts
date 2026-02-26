/**
 * registerGameHandlers
 * ゲーム関連イベントの受信ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import { readyForGameCoordinator } from "@server/application/coordinators/readyForGameCoordinator";
import { startGameCoordinator } from "@server/application/coordinators/startGameCoordinator";
import type {
  FindGameByRoomPort,
  FindGameByPlayerPort,
  FindRoomByOwnerPort,
  FindRoomByPlayerPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { placeBombUseCase } from "@server/domains/game/application/useCases/placeBombUseCase";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { reportBombHitUseCase } from "@server/domains/game/application/useCases/reportBombHitUseCase";
import { resolveRuntimeByPlayerId } from "@server/domains/room/application/services/RoomRuntimeResolver";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import {
  isBombHitReportPayload,
  isMovePayload,
  isPingPayload,
  isPlaceBombPayload,
} from "@server/network/validation/socketPayloadValidators";
import { createServerSocketOnBridge } from "@server/network/handlers/socketEventBridge";
import { createPayloadGuard } from "@server/network/handlers/payloadGuard";
import { createGameOutputAdapter } from "./createGameOutputAdapter";

/** ゲーム受信イベントごとの入力検証関数を保持するテーブル */
const gamePayloadValidators = {
  [protocol.SocketEvents.PING]: isPingPayload,
  [protocol.SocketEvents.MOVE]: isMovePayload,
  [protocol.SocketEvents.PLACE_BOMB]: isPlaceBombPayload,
  [protocol.SocketEvents.BOMB_HIT_REPORT]: isBombHitReportPayload,
} as const;

/** ゲームイベントの購読とユースケース呼び出しを設定する */
export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  roomManager: FindRoomByOwnerPort & FindRoomByPlayerPort & RoomPhaseTransitionPort,
  runtimeRegistry: FindGameByRoomPort & FindGameByPlayerPort
) => {
  const common = createCommonHandlerContext(io, socket);
  const gameOutputAdapter = createGameOutputAdapter(common);
  const { onEvent } = createServerSocketOnBridge(socket);
  const { guardOnEvent } = createPayloadGuard(socket.id);
  const guardPingPayload = guardOnEvent(
    protocol.SocketEvents.PING,
    gamePayloadValidators[protocol.SocketEvents.PING]
  );
  const guardMovePayload = guardOnEvent(
    protocol.SocketEvents.MOVE,
    gamePayloadValidators[protocol.SocketEvents.MOVE]
  );
  const guardPlaceBombPayload = guardOnEvent(
    protocol.SocketEvents.PLACE_BOMB,
    gamePayloadValidators[protocol.SocketEvents.PLACE_BOMB]
  );
  const guardBombHitReportPayload = guardOnEvent(
    protocol.SocketEvents.BOMB_HIT_REPORT,
    gamePayloadValidators[protocol.SocketEvents.BOMB_HIT_REPORT]
  );
  // 遅延計測用のPINGを検証しPONGを返す
  onEvent(protocol.SocketEvents.PING, (clientTime) => {
    if (!guardPingPayload(clientTime)) {
      return;
    }

    pingUseCase({
      clientTime,
      output: gameOutputAdapter,
    });
  });

  // オーナー開始要求に応じてゲーム進行ユースケースを起動する
  onEvent(protocol.SocketEvents.START_GAME, () => {
    startGameCoordinator({
      ownerId: socket.id,
      roomManager,
      runtimeRegistry,
      output: gameOutputAdapter,
    });
  });

  // 参加者の準備完了通知を受けて現在状態を返す
  onEvent(protocol.SocketEvents.READY_FOR_GAME, () => {
    readyForGameCoordinator({
      socketId: socket.id,
      roomManager,
      runtimeRegistry,
      output: gameOutputAdapter,
    });
  });

  // 移動入力を検証しプレイヤー移動ユースケースへ連携する
  onEvent(protocol.SocketEvents.MOVE, (data) => {
    if (!guardMovePayload(data)) {
      return;
    }

    const runtime = resolveRuntimeByPlayerId(roomManager, runtimeRegistry, socket.id);
    if (!runtime) {
      return;
    }

    movePlayerUseCase({
      gameManager: runtime.gameManager,
      playerId: socket.id,
      move: data,
    });
  });

  // 爆弾設置入力を検証し，所属ルームへ同期配信する
  onEvent(protocol.SocketEvents.PLACE_BOMB, (data) => {
    if (!guardPlaceBombPayload(data)) {
      return;
    }

    const runtime = resolveRuntimeByPlayerId(roomManager, runtimeRegistry, socket.id);
    if (!runtime) {
      return;
    }

    placeBombUseCase({
      roomId: runtime.roomId,
      bombStore: runtime.gameManager,
      input: {
        socketId: socket.id,
        payload: data,
        nowMs: Date.now(),
      },
      output: gameOutputAdapter,
    });
  });

  // 被弾報告を受信する
  onEvent(protocol.SocketEvents.BOMB_HIT_REPORT, (data) => {
    if (!guardBombHitReportPayload(data)) {
      return;
    }

    const runtime = resolveRuntimeByPlayerId(roomManager, runtimeRegistry, socket.id);
    if (!runtime) {
      return;
    }

    reportBombHitUseCase({
      roomId: runtime.roomId,
      validation: runtime.gameManager,
      input: {
        socketId: socket.id,
        payload: data,
        nowMs: Date.now(),
      },
      output: gameOutputAdapter,
    });
  });
};
