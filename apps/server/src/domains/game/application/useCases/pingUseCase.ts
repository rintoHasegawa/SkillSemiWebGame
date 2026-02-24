import type { GameOutputPort } from "../ports/gameUseCasePorts";

type PingUseCaseParams = {
  clientTime: number;
  output: Pick<GameOutputPort, "publishPongToSocket">;
};

export const pingUseCase = ({
  clientTime,
  output,
}: PingUseCaseParams) => {
  output.publishPongToSocket({
    clientTime,
    serverTime: Date.now(),
  });
};
