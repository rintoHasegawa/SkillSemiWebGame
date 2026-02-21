export const SocketEvents = {
  // 接続・切断
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  
  // ロビー・ルーム系
  JOIN_ROOM: "join-room",
  ROOM_UPDATE: "room-update",
  START_GAME: "start-game",
  GAME_START: "game-start",
  READY_FOR_GAME: "ready-for-game",
  
  // ゲームプレイ系
  CURRENT_PLAYERS: "current_players",
  NEW_PLAYER: "new_player",
  UPDATE_PLAYER: "update_player",
  REMOVE_PLAYER: "remove_player",
  MOVE: "move"
} as const;
