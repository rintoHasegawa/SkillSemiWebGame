import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { protocol } from "@repo/shared";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { createEmitToAll } from "@server/network/adapters/socketEmitters";

export const handleGameDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  const emitToAll = createEmitToAll(io);

  disconnectUseCase({
    gameManager,
    playerId,
    publishPlayerRemoved: (removedPlayerId) => {
      emitToAll(protocol.SocketEvents.REMOVE_PLAYER, removedPlayerId);
    },
  });
};
