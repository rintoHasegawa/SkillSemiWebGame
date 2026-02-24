import { Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { executeReadyForGameUseCase } from "@server/domains/game/application/useCases/executeReadyForGameUseCase";

export const onReadyForGame = (
  socket: Socket,
  gameManager: GameManager
) => {
  const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

  executeReadyForGameUseCase({
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
