import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { createEmitToAll } from "../application/adapters/createGameEmitters";

export const onDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  const emitToAll = createEmitToAll(io);

  disconnectUseCase({
    gameManager,
    playerId,
    emitToAll,
  });
};
