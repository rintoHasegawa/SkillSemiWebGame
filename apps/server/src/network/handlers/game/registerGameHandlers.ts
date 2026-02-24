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

export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  roomManager: RoomManager
) => {
  const common = createCommonHandlerContext(io, socket);

  socket.on(protocol.SocketEvents.PING, (clientTime: number) => {
    pingUseCase({
      clientTime,
      emitToSocket: common.emitToSocket,
    });
  });

  socket.on(protocol.SocketEvents.START_GAME, () => {
    startGameUseCase({
      ownerId: socket.id,
      gameManager,
      roomManager,
      emitToRoom: common.emitToRoom,
    });
  });

  socket.on(protocol.SocketEvents.READY_FOR_GAME, () => {
    const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

    readyForGameUseCase({
      socketId: socket.id,
      roomId,
      gameManager,
      emitToSocket: common.emitToSocket,
    });
  });

  socket.on(protocol.SocketEvents.MOVE, (data: playerTypes.MovePayload) => {
    movePlayerUseCase({
      gameManager,
      playerId: socket.id,
      move: data,
    });
  });
};
