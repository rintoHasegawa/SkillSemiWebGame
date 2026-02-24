type LogEventPayload = {
  event: string;
  result: string;
  socketId?: string;
  roomId?: string;
  [key: string]: unknown;
};

export const logEvent = (scope: string, payload: LogEventPayload) => {
  console.log(`[${scope}]`, payload);
};
