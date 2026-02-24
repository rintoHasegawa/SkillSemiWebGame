type PingUseCaseParams = {
  clientTime: number;
  publishPong: (payload: { clientTime: number; serverTime: number }) => void;
};

export const pingUseCase = ({
  clientTime,
  publishPong,
}: PingUseCaseParams) => {
  publishPong({
    clientTime,
    serverTime: Date.now(),
  });
};
