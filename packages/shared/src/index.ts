/**
 * index
 * shared パッケージの公開 API を集約して再公開するエントリ
 * ドメイン型，プロトコル型，設定値を外部利用向けに束ねる
 */
/** グリッドマップ関連の型定義を再公開 */
export * as gridMapTypes from "./domains/gridMap/gridMap.type";
/** グリッドマップ関連のロジックを再公開 */
export * as gridMapLogic from "./domains/gridMap/gridMap.logic";
/** プレイヤー関連の型定義を再公開 */
export * as playerTypes from "./domains/player/player.type";
/** ゲーム関連の型定義を再公開 */
export * as gameTypes from "./domains/game/game.type";
/** アプリ状態関連の型定義を再公開 */
export * as appTypes from "./domains/app/app.type";
/** アプリ状態関連の定数を再公開 */
export * as appConsts from "./domains/app/app.const";
/** ルーム関連の型定義を再公開 */
export * as roomTypes from "./domains/room/room.type";
/** ルーム関連の定数を再公開 */
export * as roomConsts from "./domains/room/room.const";
/** ソケットイベント定義を再公開 */
export * as protocol from "./protocol/events";
/** ソケットイベント関連の共有型を再公開 */
export type {
	ConnectionLifecycleEventPayloadMap,
	ConnectionLifecyclePayloadOf,
	ClientToServerEventPayloadMap,
	ClientToServerPayloadOf,
	ServerToClientEventPayloadMap,
	ServerToClientPayloadOf,
	CurrentPlayersPayload,
	GameStartPayload,
	MovePayload,
	NewPlayerPayload,
	PingPayload,
	PongPayload,
	RemovePlayerPayload,
	UpdateMapCellsPayload,
	UpdatePlayersPayload,
} from "./protocol/events";
/** ソケットイベントブリッジ生成関数を再公開 */
export { createSocketEventBridge } from "./protocol/socketEventBridge";
/** ソケットイベントブリッジ生成に必要な最小インターフェースを再公開 */
export type { SocketBridgeTarget } from "./protocol/socketEventBridge";
/** 共有設定値を再公開 */
export * as config from "./config";