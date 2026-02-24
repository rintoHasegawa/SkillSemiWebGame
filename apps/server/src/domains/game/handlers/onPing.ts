import { Socket } from "socket.io";
import { executePingUseCase } from "@server/domains/game/application/useCases/executePingUseCase";

export const onPing = (socket: Socket, clientTime: number) => {
  executePingUseCase({
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
