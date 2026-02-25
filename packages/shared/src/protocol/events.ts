/**
 * events
 * ソケット通信で利用する公開契約を再公開するエントリ
 * 分割したイベント名，ペイロード，対応表，ユーティリティ型を集約する
 */

/** ソケットイベント名定数を再公開する */
export { SocketEvents } from "./socketEvents";

/** 爆弾同期識別子の生成ユーティリティを再公開する */
export { createBombIdFromPayload } from "./bombIdentity";

/** 爆弾通信ペイロード型を再公開する */
export type { BombNetworkPayload } from "./bombIdentity";

/** 基本ペイロード型を再公開する */
export type {
  UpdatePlayersPayload,
  CurrentPlayersPayload,
  UpdateMapCellsPayload,
  NewPlayerPayload,
  RemovePlayerPayload,
  GameStartPayload,
  MovePayload,
  BombPlacedPayload,
  PingPayload,
  PongPayload,
  JoinRoomPayload,
  RoomJoinRejectedPayload,
  RoomUpdatePayload,
  GameResultPayload,
  GameResultRanking,
} from "./eventPayloads";

/** イベント方向ごとのペイロード対応表とユーティリティ型を再公開する */
export type {
  ConnectionLifecycleEventPayloadMap,
  ConnectionLifecyclePayloadOf,
  ClientToServerEventPayloadMap,
  ClientToServerPayloadOf,
  ServerToClientEventPayloadMap,
  ServerToClientPayloadOf,
} from "./eventPayloadMaps";
