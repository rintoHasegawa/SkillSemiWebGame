/**
 * events
 * ソケット通信で利用するイベント名定数を定義する
 * クライアントとサーバー間のイベント契約を共有する
 */
import type { TickData } from "../domains/game/game.type";
import type { MovePayload as PlayerMovePayload, PlayerData } from "../domains/player/player.type";
import type * as roomTypes from "../domains/room/room.type";

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
  // 1ティック分のプレイヤー状態を配列でまとめて通知する
  UPDATE_PLAYERS: "update_players",
  REMOVE_PLAYER: "remove_player",
  MOVE: "move",
  PLACE_BOMB: "place-bomb",
  UPDATE_MAP_CELLS: "update_map_cells",
  BOMB_PLACED: "bomb-placed",

  // 時間同期・ゲーム進行関連
  PING: "ping",           // クライアントからの時刻同期リクエスト（ラグ計算用）
  PONG: "pong",           // サーバーからの現在時刻レスポンス
  GAME_END: "game-end",   // 3分経過時のゲーム終了通知
  GAME_RESULT: "game-result", // 3分終了時の最終結果通知
} as const;

/**
 * ------------------------------------------------------------
 * ペイロード型定義
 * ------------------------------------------------------------
 */

/** UPDATE_PLAYERS イベントで送受信するプレイヤー差分配列 */
export type UpdatePlayersPayload = TickData["playerUpdates"];

/** CURRENT_PLAYERS イベントで送受信するプレイヤー一覧 */
export type CurrentPlayersPayload = TickData["playerUpdates"];

/** UPDATE_MAP_CELLS イベントで送受信するマップ差分配列 */
export type UpdateMapCellsPayload = TickData["cellUpdates"];

/** NEW_PLAYER イベントで送受信するプレイヤー情報 */
export type NewPlayerPayload = PlayerData;

/** REMOVE_PLAYER イベントで送受信するプレイヤーID */
export type RemovePlayerPayload = PlayerData["id"];

/** GAME_START イベントで送受信するゲーム開始情報 */
export type GameStartPayload = { startTime: number };

/** MOVE イベントで送受信する移動入力情報 */
export type MovePayload = PlayerMovePayload;

/** PLACE_BOMB / BOMB_PLACED イベントで送受信する爆弾情報 */
export type BombPlacedPayload = {
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/** PING イベントで送受信する時刻同期リクエスト */
export type PingPayload = number;

/** PONG イベントで送受信する時刻同期レスポンス */
export type PongPayload = {
  clientTime: number;
  serverTime: number;
};

/** GAME_RESULT イベントで送受信するランキング1行 */
export type GameResultRanking = {
  rank: number;
  teamId: number;
  teamName: string;
  paintRate: number;
};

/** GAME_RESULT イベントで送受信する最終結果 */
export type GameResultPayload = {
  rankings: GameResultRanking[];
};

/**
 * ------------------------------------------------------------
 * イベント方向ごとのペイロード対応表
 * ------------------------------------------------------------
 */

/** 接続ライフサイクルイベントのペイロード対応表 */
export type ConnectionLifecycleEventPayloadMap = {
  [SocketEvents.CONNECT]: undefined;
  [SocketEvents.DISCONNECT]: undefined;
};

/** クライアントからサーバーへ送信するイベントごとのペイロード対応表 */
export type ClientToServerEventPayloadMap = {
  [SocketEvents.JOIN_ROOM]: roomTypes.JoinRoomPayload;
  [SocketEvents.START_GAME]: undefined;
  [SocketEvents.READY_FOR_GAME]: undefined;
  [SocketEvents.MOVE]: MovePayload;
  [SocketEvents.PLACE_BOMB]: BombPlacedPayload;
  [SocketEvents.PING]: PingPayload;
};

/** サーバーからクライアントへ送信するイベントごとのペイロード対応表 */
export type ServerToClientEventPayloadMap = {
  [SocketEvents.ROOM_JOIN_REJECTED]: roomTypes.JoinRoomRejectedPayload;
  [SocketEvents.ROOM_UPDATE]: roomTypes.Room;
  [SocketEvents.GAME_START]: GameStartPayload;
  [SocketEvents.CURRENT_PLAYERS]: CurrentPlayersPayload;
  [SocketEvents.NEW_PLAYER]: NewPlayerPayload;
  [SocketEvents.UPDATE_PLAYERS]: UpdatePlayersPayload;
  [SocketEvents.REMOVE_PLAYER]: RemovePlayerPayload;
  [SocketEvents.UPDATE_MAP_CELLS]: UpdateMapCellsPayload;
  [SocketEvents.BOMB_PLACED]: BombPlacedPayload;
  [SocketEvents.PONG]: PongPayload;
  [SocketEvents.GAME_END]: undefined;
  [SocketEvents.GAME_RESULT]: GameResultPayload;
};

/**
 * ------------------------------------------------------------
 * イベント名からペイロード型を引くユーティリティ
 * ------------------------------------------------------------
 */

/** 接続ライフサイクルイベントのペイロード型を取得するユーティリティ */
export type ConnectionLifecyclePayloadOf<TEvent extends keyof ConnectionLifecycleEventPayloadMap> =
  ConnectionLifecycleEventPayloadMap[TEvent];

/** クライアント送信イベントのペイロード型を取得するユーティリティ */
export type ClientToServerPayloadOf<TEvent extends keyof ClientToServerEventPayloadMap> =
  ClientToServerEventPayloadMap[TEvent];

/** サーバー送信イベントのペイロード型を取得するユーティリティ */
export type ServerToClientPayloadOf<TEvent extends keyof ServerToClientEventPayloadMap> =
  ServerToClientEventPayloadMap[TEvent];
