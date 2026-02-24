import { Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { protocol } from "@repo/shared";

export const onReadyForGame = (
  socket: Socket,
  gameManager: GameManager
) => {
  const allPlayers = gameManager.getAllPlayers();
  socket.emit(protocol.SocketEvents.CURRENT_PLAYERS, allPlayers);
  console.log("[GameHandler] READY_FOR_GAME received", {
    socketId: socket.id,
    totalPlayers: allPlayers.length,
  });

  const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);
  if (roomId) {
    const startTime = gameManager.getRoomStartTime(roomId);
    if (startTime) {
      socket.emit(protocol.SocketEvents.GAME_START, { startTime });
      console.log("[GameHandler] GAME_START sent to ready client", {
        socketId: socket.id,
        roomId,
        startTime,
      });
    }
  } else {
    console.log("[GameHandler] READY_FOR_GAME missing roomId", { socketId: socket.id });
  }
};
