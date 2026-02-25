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
  UPDATE_MAP_CELLS: "update_map_cells",

  // 時間同期・ゲーム進行関連
  PING: "ping",           // クライアントからの時刻同期リクエスト（ラグ計算用）
  PONG: "pong",           // サーバーからの現在時刻レスポンス
  GAME_END: "game-end",   // 3分経過時のゲーム終了通知
} as const;

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

/** PING イベントで送受信する時刻同期リクエスト */
export type PingPayload = number;

/** PONG イベントで送受信する時刻同期レスポンス */
export type PongPayload = {
  clientTime: number;
  serverTime: number;
};

/** ソケットイベントごとのペイロード対応表 */
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
  [SocketEvents.PONG]: PongPayload;
  [SocketEvents.GAME_END]: undefined;
};

/** 後方互換のための統合イベントマップ */
export type SocketPayloadMap =
  & ConnectionLifecycleEventPayloadMap
  & ClientToServerEventPayloadMap
  & ServerToClientEventPayloadMap;

/** クライアント送信イベントのペイロード型を取得するユーティリティ */
export type ClientToServerPayloadOf<TEvent extends keyof ClientToServerEventPayloadMap> =
  ClientToServerEventPayloadMap[TEvent];

/** サーバー送信イベントのペイロード型を取得するユーティリティ */
export type ServerToClientPayloadOf<TEvent extends keyof ServerToClientEventPayloadMap> =
  ServerToClientEventPayloadMap[TEvent];

/** 接続ライフサイクルイベントのペイロード型を取得するユーティリティ */
export type ConnectionLifecyclePayloadOf<TEvent extends keyof ConnectionLifecycleEventPayloadMap> =
  ConnectionLifecycleEventPayloadMap[TEvent];

/** 指定イベント名に対応するペイロード型を取得するユーティリティ */
export type PayloadOf<TEvent extends keyof SocketPayloadMap> = SocketPayloadMap[TEvent];
