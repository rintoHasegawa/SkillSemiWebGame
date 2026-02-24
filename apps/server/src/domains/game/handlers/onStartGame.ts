import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";

const getEmitToRoom = (io: Server) => createEmitToRoom(io);

export const onStartGame = (
  io: Server,
  gameManager: GameManager,
  roomManager: RoomManager,
  ownerId: string
) => {
  const emitToRoom = getEmitToRoom(io);

  startGameUseCase({
    ownerId,
    gameManager,
    roomManager,
    emitToRoom,
  });
};
