/**
 * eventPayloadMaps
 * イベント方向ごとのペイロード対応表を定義する
 * イベント名定数とペイロード型の対応契約を集約する
 */
import { SocketEvents } from "./socketEvents";
import type {
  BombPlacedPayload,
  CurrentPlayersPayload,
  GameResultPayload,
  GameStartPayload,
  JoinRoomPayload,
  MovePayload,
  NewPlayerPayload,
  PingPayload,
  PongPayload,
  RemovePlayerPayload,
  RoomJoinRejectedPayload,
  RoomUpdatePayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "./eventPayloads";

/** 接続ライフサイクルイベントのペイロード対応表 */
export type ConnectionLifecycleEventPayloadMap = {
  [SocketEvents.CONNECT]: undefined;
  [SocketEvents.DISCONNECT]: undefined;
};

/** クライアントからサーバーへ送信するイベントごとのペイロード対応表 */
export type ClientToServerEventPayloadMap = {
  [SocketEvents.JOIN_ROOM]: JoinRoomPayload;
  [SocketEvents.START_GAME]: undefined;
  [SocketEvents.READY_FOR_GAME]: undefined;
  [SocketEvents.MOVE]: MovePayload;
  [SocketEvents.PLACE_BOMB]: BombPlacedPayload;
  [SocketEvents.PING]: PingPayload;
};

/** サーバーからクライアントへ送信するイベントごとのペイロード対応表 */
export type ServerToClientEventPayloadMap = {
  [SocketEvents.ROOM_JOIN_REJECTED]: RoomJoinRejectedPayload;
  [SocketEvents.ROOM_UPDATE]: RoomUpdatePayload;
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

/** 接続ライフサイクルイベントのペイロード型を取得するユーティリティ */
export type ConnectionLifecyclePayloadOf<TEvent extends keyof ConnectionLifecycleEventPayloadMap> =
  ConnectionLifecycleEventPayloadMap[TEvent];

/** クライアント送信イベントのペイロード型を取得するユーティリティ */
export type ClientToServerPayloadOf<TEvent extends keyof ClientToServerEventPayloadMap> =
  ClientToServerEventPayloadMap[TEvent];

/** サーバー送信イベントのペイロード型を取得するユーティリティ */
export type ServerToClientPayloadOf<TEvent extends keyof ServerToClientEventPayloadMap> =
  ServerToClientEventPayloadMap[TEvent];
