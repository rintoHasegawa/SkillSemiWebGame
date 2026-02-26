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
  START_GAME: "start-game",
  GAME_START: "game-start",
  READY_FOR_GAME: "ready-for-game",

  // ゲームプレイ関連イベント名
  CURRENT_PLAYERS: "current_players",
  NEW_PLAYER: "new_player",
  UPDATE_PLAYERS: "update_players",
  REMOVE_PLAYER: "remove_player",
  MOVE: "move",
  PLACE_BOMB: "place-bomb",
  BOMB_HIT_REPORT: "bomb-hit-report",
  UPDATE_MAP_CELLS: "update_map_cells",
  BOMB_PLACED: "bomb-placed",
  BOMB_PLACED_ACK: "bomb-placed-ack",
  PLAYER_DEAD: "player-dead",

  // 時間同期・ゲーム進行関連
  PING: "ping",
  PONG: "pong",
  GAME_END: "game-end",
  GAME_RESULT: "game-result",
} as const;
