import { protocol } from "@repo/shared";

type EmitToSocket = (event: string, payload?: unknown) => void;

type PingUseCaseParams = {
  clientTime: number;
  emitToSocket: EmitToSocket;
};

export const pingUseCase = ({
  clientTime,
  emitToSocket,
}: PingUseCaseParams) => {
  emitToSocket(protocol.SocketEvents.PONG, {
    clientTime,
    serverTime: Date.now(),
  });
};
