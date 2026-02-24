import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { disconnectUseCase } from "@server/domains/game/application/useCases/executeDisconnectUseCase";

export const onDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  disconnectUseCase({
    gameManager,
    playerId,
    emitToAll: (event, payload) => {
      if (payload === undefined) {
        io.emit(event);
        return;
      }

      io.emit(event, payload);
    },
  });
};
