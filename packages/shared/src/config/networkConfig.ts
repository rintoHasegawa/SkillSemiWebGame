export const NETWORK_CONFIG = {
  DEV_SERVER_HOST: "http://localhost",
  DEV_SERVER_PORT: 3000,
  get DEV_SERVER_URL() { return `${this.DEV_SERVER_HOST}:${this.DEV_SERVER_PORT}`; },
  PROD_SERVER_URL: "https://skillsemiwebgame.onrender.com",
  SOCKET_TRANSPORTS: ["websocket", "polling"],
  CORS_ORIGIN: "*",
  CORS_METHODS: ["GET", "POST"],
  SOCKET_IO_PATH: "/socket.io",
} as const;
