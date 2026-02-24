import { Socket } from "socket.io";
import { pingUseCase } from "@server/domains/game/application/useCases/executePingUseCase";

export const onPing = (socket: Socket, clientTime: number) => {
  pingUseCase({
    clientTime,
    emitToSocket: (event, payload) => {
      if (payload === undefined) {
        socket.emit(event);
        return;
      }

      socket.emit(event, payload);
    },
  });
};
