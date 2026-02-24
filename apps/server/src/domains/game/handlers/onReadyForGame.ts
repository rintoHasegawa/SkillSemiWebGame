import { Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";
import { createEmitToSocket } from "@server/network/adapters/socketEmitters";

const getEmitToSocket = (socket: Socket) => createEmitToSocket(socket);

export const onReadyForGame = (
  socket: Socket,
  gameManager: GameManager
) => {
  const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);
  const emitToSocket = getEmitToSocket(socket);

  readyForGameUseCase({
    socketId: socket.id,
    roomId,
    gameManager,
    emitToSocket,
  });
};
