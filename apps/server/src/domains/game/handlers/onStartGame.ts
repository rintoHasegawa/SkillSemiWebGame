import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { createEmitToRoom } from "../application/adapters/createGameEmitters";

export const onStartGame = (
  io: Server,
  gameManager: GameManager,
  roomManager: RoomManager,
  ownerId: string
) => {
  const emitToRoom = createEmitToRoom(io);

  startGameUseCase({
    ownerId,
    gameManager,
    roomManager,
    emitToRoom,
  });
};
