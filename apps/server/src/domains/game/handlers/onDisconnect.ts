import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { protocol } from "@repo/shared";

export const onDisconnect = (
  io: Server,
  gameManager: GameManager,
  playerId: string
) => {
  gameManager.removePlayer(playerId);
  io.emit(protocol.SocketEvents.REMOVE_PLAYER, playerId);
  console.log("[GameHandler] player removed", { playerId });
};
