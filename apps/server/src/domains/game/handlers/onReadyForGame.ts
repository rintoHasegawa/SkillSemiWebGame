import { Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";
import { createEmitToSocket } from "../application/adapters/createGameEmitters";

export const onReadyForGame = (
  socket: Socket,
  gameManager: GameManager
) => {
  const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);
  const emitToSocket = createEmitToSocket(socket);

  readyForGameUseCase({
    socketId: socket.id,
    roomId,
    gameManager,
    emitToSocket,
  });
};
