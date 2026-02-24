import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { createEmitToAll } from "@server/network/adapters/socketEmitters";

export const handleGameDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  disconnectUseCase({
    gameManager,
    playerId,
    emitToAll: createEmitToAll(io),
  });
};
