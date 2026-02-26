/**
 * registerGameHandlers
 * ゲーム関連イベントの受信ハンドラを登録する
 */
import { Socket } from "socket.io";
import { protocol } from "@repo/shared";
import type {
  GameHandlerRoomPort,
  GameHandlerRuntimePort,
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

/** ゲームイベントの購読とユースケース呼び出しを設定する */
export const registerGameHandlers = (
  socket: Socket,
  roomManager: GameHandlerRoomPort,
  runtimeRegistry: GameHandlerRuntimePort,
  gameOutputAdapter: GameOutputAdapter,
) => {
  const { onEvent } = createServerSocketOnBridge(socket);
  const { guardOnEvent } = createPayloadGuard(socket.id);
  const guardPingPayload = guardOnEvent(
    protocol.SocketEvents.PING,
    gamePayloadValidators[protocol.SocketEvents.PING],
  );
  const guardMovePayload = guardOnEvent(
    protocol.SocketEvents.MOVE,
    gamePayloadValidators[protocol.SocketEvents.MOVE],
  );
  const guardPlaceBombPayload = guardOnEvent(
    protocol.SocketEvents.PLACE_BOMB,
    gamePayloadValidators[protocol.SocketEvents.PLACE_BOMB],
  );
  const guardBombHitReportPayload = guardOnEvent(
    protocol.SocketEvents.BOMB_HIT_REPORT,
    gamePayloadValidators[protocol.SocketEvents.BOMB_HIT_REPORT],
  );
  // 遅延計測用のPINGを検証しPONGを返す
  onEvent(protocol.SocketEvents.PING, (clientTime) => {
    if (!guardPingPayload(clientTime)) {
      return;
    }

    handlePingEvent(
      {
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        output: gameOutputAdapter,
      },
      clientTime,
    );
  });

  // オーナー開始要求に応じてゲーム進行ユースケースを起動する
  onEvent(protocol.SocketEvents.START_GAME, (data) => {
    if (!isStartGamePayload(data)) {
      return;
    }

    handleStartGameEvent(
      {
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        output: gameOutputAdapter,
      },
      data,
    );
  });

  // 参加者の準備完了通知を受けて現在状態を返す
  onEvent(protocol.SocketEvents.READY_FOR_GAME, () => {
    handleReadyForGameEvent({
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

    handleMoveEvent(
      {
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        output: gameOutputAdapter,
      },
      data,
    );
  });

  // 爆弾設置入力を検証し，所属ルームへ同期配信する
  onEvent(protocol.SocketEvents.PLACE_BOMB, (data) => {
    if (!guardPlaceBombPayload(data)) {
      return;
    }

    handlePlaceBombEvent(
      {
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        output: gameOutputAdapter,
      },
      data,
    );
  });

  // 被弾報告を受信する
  onEvent(protocol.SocketEvents.BOMB_HIT_REPORT, (data) => {
    if (!guardBombHitReportPayload(data)) {
      return;
    }

    handleBombHitReportEvent(
      {
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        output: gameOutputAdapter,
      },
      data,
    );
  });
};
