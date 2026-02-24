import { protocol } from "@repo/shared";

type EmitToSocket = (event: string, payload?: unknown) => void;

type ExecutePingUseCaseParams = {
  clientTime: number;
  emitToSocket: EmitToSocket;
};

export const executePingUseCase = ({
  clientTime,
  emitToSocket,
}: ExecutePingUseCaseParams) => {
  emitToSocket(protocol.SocketEvents.PONG, {
    clientTime,
    serverTime: Date.now(),
  });
};
