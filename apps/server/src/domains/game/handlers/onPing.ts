import { Socket } from "socket.io";
import { protocol } from "@repo/shared";

export const onPing = (socket: Socket, clientTime: number) => {
  socket.emit(protocol.SocketEvents.PONG, { clientTime, serverTime: Date.now() });
};
