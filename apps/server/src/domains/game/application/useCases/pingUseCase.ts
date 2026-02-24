/**
 * pingUseCase
 * PING受信時に時刻情報付きPONGを返して遅延計測を支援する
 */
import type { GameOutputPort } from "../ports/gameUseCasePorts";

type PingUseCaseParams = {
  clientTime: number;
  output: Pick<GameOutputPort, "publishPongToSocket">;
};

/** クライアント時刻を受け取りサーバー時刻付きで応答する */
export const pingUseCase = ({
  clientTime,
  output,
}: PingUseCaseParams) => {
  output.publishPongToSocket({
    clientTime,
    serverTime: Date.now(),
  });
};
