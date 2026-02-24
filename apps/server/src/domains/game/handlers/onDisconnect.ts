import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { createEmitToAll } from "@server/network/adapters/socketEmitters";

const getEmitToAll = (io: Server) => createEmitToAll(io);

export const onDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  const emitToAll = getEmitToAll(io);

  disconnectUseCase({
    gameManager,
    playerId,
    emitToAll,
  });
};
