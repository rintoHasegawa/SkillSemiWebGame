/**
 * socketEvents
 * ソケット通信で利用するイベント名定数を定義する
 * クライアントとサーバー間で共通利用する契約名を集約する
 */

/** ソケットイベント名の一覧定数 */
export const SocketEvents = {
  // 接続・切断イベント名
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  // ロビー・ルーム関連イベント名
  JOIN_ROOM: "join-room",
  ROOM_JOIN_REJECTED: "room-join-rejected",
  ROOM_UPDATE: "room-update",
  LOBBY_SETTINGS_UPDATE: "lobby-settings-update",
  START_GAME: "start-game",
  GAME_START: "game-start",
  READY_FOR_GAME: "ready-for-game",

  // ゲームプレイ関連イベント名
  CURRENT_PLAYERS_SYNC: "current-players",
  NEW_PLAYER_SYNC: "new-player",
  UPDATE_PLAYERS_SYNC: "update-players",
  REMOVE_PLAYER_SYNC: "remove-player",
  UPDATE_MAP_CELLS_SYNC: "update-map-cells",
  CURRENT_HURRICANES_SYNC: "current-hurricanes",
  UPDATE_HURRICANES_SYNC: "update-hurricanes",

  // 互換維持のため残す旧キー名
  CURRENT_PLAYERS: "current-players",
  NEW_PLAYER: "new-player",
  UPDATE_PLAYERS: "update-players",
  REMOVE_PLAYER: "remove-player",
  MOVE: "move",
  PLACE_BOMB: "place-bomb",
  BOMB_HIT_REPORT: "bomb-hit-report",
  UPDATE_MAP_CELLS: "update-map-cells",
  CURRENT_HURRICANES: "current-hurricanes",
  UPDATE_HURRICANES: "update-hurricanes",
  BOMB_PLACED: "bomb-placed",
  BOMB_PLACED_ACK: "bomb-placed-ack",
  PLAYER_HIT: "player-hit",
  HURRICANE_HIT: "hurricane-hit",

  // 時間同期・ゲーム進行関連
  PING: "ping",
  PONG: "pong",
  GAME_END: "game-end",
  GAME_RESULT: "game-result",
} as const;
