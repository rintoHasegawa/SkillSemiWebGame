export const SocketEvents = {
  // 接続・切断イベント名
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  
  // ロビー・ルーム関連イベント名
  JOIN_ROOM: "join-room",
  ROOM_UPDATE: "room-update",
  START_GAME: "start-game",
  GAME_START: "game-start",
  READY_FOR_GAME: "ready-for-game",
  
  // ゲームプレイ関連イベント名
  CURRENT_PLAYERS: "current_players",
  NEW_PLAYER: "new_player",
  UPDATE_PLAYER: "update_player",
  REMOVE_PLAYER: "remove_player",
  MOVE: "move",
  UPDATE_MAP_CELLS: "update_map_cells",
} as const;
