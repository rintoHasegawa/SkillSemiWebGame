import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { handleGameDisconnect as handleDomainGameDisconnect } from "@server/domains/game/GameHandler";

export const handleGameDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  handleDomainGameDisconnect(io, gameManager, playerId);
};
