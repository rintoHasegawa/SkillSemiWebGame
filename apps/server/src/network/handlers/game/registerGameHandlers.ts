import { Server, Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import type { playerTypes } from "@repo/shared";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { readyForGameUseCase } from "@server/domains/game/application/useCases/readyForGameUseCase";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";

export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  roomManager: RoomManager
) => {
  const common = createCommonHandlerContext(io, socket);

  socket.on(protocol.SocketEvents.PING, (clientTime: number) => {
    pingUseCase({
      clientTime,
      publishPong: (payload) => {
        common.emitToSocket(protocol.SocketEvents.PONG, payload);
      },
    });
  });

  socket.on(protocol.SocketEvents.START_GAME, () => {
    startGameUseCase({
      ownerId: socket.id,
      gameManager,
      roomManager,
      publishUpdatePlayer: (roomId, playerData) => {
        common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_PLAYER, playerData);
      },
      publishMapCellUpdates: (roomId, cellUpdates) => {
        common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, cellUpdates);
      },
      publishGameEnd: (roomId) => {
        common.emitToRoom(roomId, protocol.SocketEvents.GAME_END);
      },
      publishGameStart: (roomId, payload) => {
        common.emitToRoom(roomId, protocol.SocketEvents.GAME_START, payload);
      },
    });
  });

  socket.on(protocol.SocketEvents.READY_FOR_GAME, () => {
    const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

    readyForGameUseCase({
      socketId: socket.id,
      roomId,
      gameManager,
      publishCurrentPlayers: (players) => {
        common.emitToSocket(protocol.SocketEvents.CURRENT_PLAYERS, players);
      },
      publishGameStart: (payload) => {
        common.emitToSocket(protocol.SocketEvents.GAME_START, payload);
      },
    });
  });

  socket.on(protocol.SocketEvents.MOVE, (data: playerTypes.MovePayload) => {
    movePlayerUseCase({
      gameManager,
      playerId: socket.id,
      move: data,
    });
  });
};
