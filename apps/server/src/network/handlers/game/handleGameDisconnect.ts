import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { createGameDisconnectPublisher } from "./createGameEventPublisher";

export const handleGameDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  const gameDisconnectPublisher = createGameDisconnectPublisher(io);

  disconnectUseCase({
    gameManager,
    playerId,
    publishPlayerRemoved: gameDisconnectPublisher.publishPlayerRemoved,
  });
};
