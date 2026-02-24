import { Server, Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import type { playerTypes } from "@repo/shared";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import { createGameEventPublisher } from "./createGameEventPublisher";
import { logEvent } from "@server/logging/logEvent";
import { isMovePayload, isPingPayload } from "@server/network/validation/socketPayloadValidators";

export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  roomManager: RoomManager
) => {
  const common = createCommonHandlerContext(io, socket);
  const gamePublisher = createGameEventPublisher(common);

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
      publishPong: gamePublisher.publishPongToSocket,
    });
  });

  socket.on(protocol.SocketEvents.START_GAME, () => {
    startGameUseCase({
      ownerId: socket.id,
      gameManager,
      roomManager,
      publishUpdatePlayer: gamePublisher.publishUpdatePlayerToRoom,
      publishMapCellUpdates: gamePublisher.publishMapCellUpdatesToRoom,
      publishGameEnd: gamePublisher.publishGameEndToRoom,
      publishGameStart: gamePublisher.publishGameStartToRoom,
    });
  });

  socket.on(protocol.SocketEvents.READY_FOR_GAME, () => {
    const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

    readyForGameUseCase({
      socketId: socket.id,
      roomId,
      gameManager,
      publishCurrentPlayers: gamePublisher.publishCurrentPlayersToSocket,
      publishGameStart: gamePublisher.publishGameStartToSocket,
    });
  });

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
