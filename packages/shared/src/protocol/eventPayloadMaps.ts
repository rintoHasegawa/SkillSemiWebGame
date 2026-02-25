/**
 * eventPayloadMaps
 * イベント方向ごとのペイロード対応表を再公開するエントリ
 * 機能別に分割した対応表を合成して公開契約を維持する
 */
import type {
  ConnectionLifecycleEventPayloadMap as CommonConnectionLifecycleEventPayloadMap,
} from "./maps/commonEventPayloadMap";
import type {
  LobbyClientToServerEventPayloadMap,
  LobbyServerToClientEventPayloadMap,
} from "./maps/lobbyEventPayloadMap";
import type {
  GameClientToServerEventPayloadMap,
  GameServerToClientEventPayloadMap,
} from "./maps/gameEventPayloadMap";

/** 接続ライフサイクルイベントのペイロード対応表を再公開する */
export type { ConnectionLifecycleEventPayloadMap } from "./maps/commonEventPayloadMap";

/** 接続ライフサイクルイベントのペイロード対応表 */
type ConnectionLifecycleEventPayloadMap = CommonConnectionLifecycleEventPayloadMap;

/** クライアントからサーバーへ送信するイベントごとのペイロード対応表 */
export type ClientToServerEventPayloadMap =
  & LobbyClientToServerEventPayloadMap
  & GameClientToServerEventPayloadMap;

/** サーバーからクライアントへ送信するイベントごとのペイロード対応表 */
export type ServerToClientEventPayloadMap =
  & LobbyServerToClientEventPayloadMap
  & GameServerToClientEventPayloadMap;

/** 接続ライフサイクルイベントのペイロード型を取得するユーティリティ */
export type ConnectionLifecyclePayloadOf<TEvent extends keyof ConnectionLifecycleEventPayloadMap> =
  ConnectionLifecycleEventPayloadMap[TEvent];

/** クライアント送信イベントのペイロード型を取得するユーティリティ */
export type ClientToServerPayloadOf<TEvent extends keyof ClientToServerEventPayloadMap> =
  ClientToServerEventPayloadMap[TEvent];

/** サーバー送信イベントのペイロード型を取得するユーティリティ */
export type ServerToClientPayloadOf<TEvent extends keyof ServerToClientEventPayloadMap> =
  ServerToClientEventPayloadMap[TEvent];
