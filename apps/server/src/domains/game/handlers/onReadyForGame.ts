import { Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";

export const onReadyForGame = (
  socket: Socket,
  gameManager: GameManager
) => {
  const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

  readyForGameUseCase({
    socketId: socket.id,
    roomId,
    gameManager,
    emitToSocket: (event, payload) => {
      if (payload === undefined) {
        socket.emit(event);
        return;
      }

      socket.emit(event, payload);
    },
  });
};
