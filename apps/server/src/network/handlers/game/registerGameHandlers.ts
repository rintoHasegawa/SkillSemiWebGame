/**
 * registerGameHandlers
 * ゲーム関連イベントの受信ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import type { PayloadOf, SocketPayloadMap } from "@repo/shared";
import { readyForGameCoordinator } from "@server/application/coordinators/readyForGameCoordinator";
import { startGameCoordinator } from "@server/application/coordinators/startGameCoordinator";
import type {
  MovePlayerPort,
  ReadyForGamePort,
  ReadyForGameRoomPort,
  StartGamePort,
  StartGameRoomPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { logEvent } from "@server/logging/logEvent";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import { isMovePayload, isPingPayload } from "@server/network/validation/socketPayloadValidators";
import { createGameOutputAdapter } from "./createGameOutputAdapter";

type SocketEventName = Exclude<keyof SocketPayloadMap, "connect" | "disconnect">;

/** ゲームイベントの購読とユースケース呼び出しを設定する */
export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  gameManager: StartGamePort & ReadyForGamePort & MovePlayerPort,
  roomManager: StartGameRoomPort & ReadyForGameRoomPort
) => {
  const common = createCommonHandlerContext(io, socket);
  const gameOutputAdapter = createGameOutputAdapter(common);

  const onEvent = <TEvent extends SocketEventName>(
    event: TEvent,
    callback: (payload: PayloadOf<TEvent>) => void
  ) => {
    (socket as any).on(event, callback);
  };

  // 遅延計測用のPINGを検証しPONGを返す
  onEvent(protocol.SocketEvents.PING, (clientTime) => {
    if (!isPingPayload(clientTime)) {
      logEvent("Network", {
        event: "PING",
        result: "ignored_invalid_payload",
        socketId: socket.id,
      });
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
    if (!isMovePayload(data)) {
      logEvent("Network", {
        event: "MOVE",
        result: "ignored_invalid_payload",
        socketId: socket.id,
      });
      return;
    }

    movePlayerUseCase({
      gameManager,
      playerId: socket.id,
      move: data,
    });
  });
};
