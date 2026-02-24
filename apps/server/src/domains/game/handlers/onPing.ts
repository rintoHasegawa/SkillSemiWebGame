import { Socket } from "socket.io";
import { pingUseCase } from "@server/domains/game/application/useCases/pingUseCase";
import { createEmitToSocket } from "../application/adapters/createGameEmitters";

export const onPing = (socket: Socket, clientTime: number) => {
  const emitToSocket = createEmitToSocket(socket);

  pingUseCase({
    clientTime,
    emitToSocket,
  });
};
