/**
 * registerGameHandlers
 * ゲーム関連イベントの受信ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import { readyForGameCoordinator } from "@server/application/coordinators/readyForGameCoordinator";
import { startGameCoordinator } from "@server/application/coordinators/startGameCoordinator";
import type {
  FindRoomByOwnerPort,
  FindRoomByPlayerPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import type {
  BombPlacementPort,
  BombCleanupPort,
  MovePlayerPort,
  ReadyForGamePort,
  StartGamePort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { placeBombUseCase } from "@server/domains/game/application/useCases/placeBombUseCase";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import { isMovePayload, isPingPayload, isPlaceBombPayload } from "@server/network/validation/socketPayloadValidators";
import { createServerSocketOnBridge } from "@server/network/handlers/socketEventBridge";
import { createPayloadGuard } from "@server/network/handlers/payloadGuard";
import { createGameOutputAdapter } from "./createGameOutputAdapter";

/** ゲーム受信イベントごとの入力検証関数を保持するテーブル */
const gamePayloadValidators = {
  [protocol.SocketEvents.PING]: isPingPayload,
  [protocol.SocketEvents.MOVE]: isMovePayload,
  [protocol.SocketEvents.PLACE_BOMB]: isPlaceBombPayload,
} as const;

/** ゲームイベントの購読とユースケース呼び出しを設定する */
export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  gameManager: StartGamePort & ReadyForGamePort & MovePlayerPort,
  bombState: BombPlacementPort & BombCleanupPort,
  roomManager: FindRoomByOwnerPort & FindRoomByPlayerPort & RoomPhaseTransitionPort
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
      gameManager,
      bombState,
      roomManager,
      output: gameOutputAdapter,
    });
  });

  // 参加者の準備完了通知を受けて現在状態を返す
  onEvent(protocol.SocketEvents.READY_FOR_GAME, () => {
    readyForGameCoordinator({
      socketId: socket.id,
      gameManager,
      roomManager,
      output: gameOutputAdapter,
    });
  });

  // 移動入力を検証しプレイヤー移動ユースケースへ連携する
  onEvent(protocol.SocketEvents.MOVE, (data) => {
    if (!guardMovePayload(data)) {
      return;
    }

    movePlayerUseCase({
      gameManager,
      playerId: socket.id,
      move: data,
    });
  });

  // 爆弾設置入力を検証し，所属ルームへ同期配信する
  onEvent(protocol.SocketEvents.PLACE_BOMB, (data) => {
    if (!guardPlaceBombPayload(data)) {
      return;
    }

    placeBombUseCase({
      roomResolver: roomManager,
      bombStore: bombState,
      input: {
        socketId: socket.id,
        payload: data,
        nowMs: Date.now(),
      },
      output: gameOutputAdapter,
    });
  });
};
