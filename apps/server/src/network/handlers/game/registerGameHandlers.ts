/**
 * registerGameHandlers
 * ゲーム関連イベントの受信ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import { createGameEventPublisher } from "./createGameEventPublisher";
import { logEvent } from "@server/logging/logEvent";
import { isMovePayload, isPingPayload } from "@server/network/validation/socketPayloadValidators";

/** ゲームイベントの購読とユースケース呼び出しを設定する */
export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  roomManager: RoomManager
) => {
  const common = createCommonHandlerContext(io, socket);
  const gamePublisher = createGameEventPublisher(common);

  // 遅延計測用のPINGを検証しPONGを返す
  socket.on(protocol.SocketEvents.PING, (clientTime: unknown) => {
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
      output: gamePublisher,
    });
  });

  // オーナー開始要求に応じてゲーム進行ユースケースを起動する
  socket.on(protocol.SocketEvents.START_GAME, () => {
    startGameUseCase({
      ownerId: socket.id,
      gameManager,
      roomManager,
      output: gamePublisher,
    });
  });

  // 参加者の準備完了通知を受けて現在状態を返す
  socket.on(protocol.SocketEvents.READY_FOR_GAME, () => {
    const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

    readyForGameUseCase({
      socketId: socket.id,
      roomId,
      gameManager,
      output: gamePublisher,
    });
  });

  // 移動入力を検証しプレイヤー移動ユースケースへ連携する
  socket.on(protocol.SocketEvents.MOVE, (data: unknown) => {
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
