import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { executeStartGameUseCase } from "@server/domains/game/application/useCases/executeStartGameUseCase";

export const onStartGame = (
  io: Server,
  gameManager: GameManager,
  roomManager: RoomManager,
  ownerId: string
) => {
  executeStartGameUseCase({
    ownerId,
    gameManager,
    roomManager,
    emitToRoom: (roomId, event, payload) => {
      if (payload === undefined) {
        io.to(roomId).emit(event);
        return;
      }

      io.to(roomId).emit(event, payload);
    },
  });
};
