import { Socket } from "socket.io";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { createEmitToSocket } from "@server/network/adapters/socketEmitters";

const getEmitToSocket = (socket: Socket) => createEmitToSocket(socket);

export const onPing = (socket: Socket, clientTime: number) => {
  const emitToSocket = getEmitToSocket(socket);

  pingUseCase({
    clientTime,
    emitToSocket,
  });
};
