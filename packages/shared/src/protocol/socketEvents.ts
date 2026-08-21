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
  SELECT_TEAM: "select-team",
  SELECT_TEAM_REJECTED: "select-team-rejected",
  START_GAME: "start-game",
  GAME_START: "game-start",
  READY_FOR_GAME: "ready-for-game",

  // ゲームプレイ関連イベント名
  // ※ 同じイベント名を指す別名キーは作らず，1イベント1キーで定義する
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
