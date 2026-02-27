/**
 * index
 * protocol 配下の公開要素を集約して再公開する
 * イベント契約と bridge をまとめた安定公開面を提供する
 */

/** ソケットイベント契約を再公開する */
export * from "./events";
/** ソケットイベント bridge を再公開する */
export { createSocketEventBridge } from "./socketEventBridge";
/** ソケットイベント bridge の対象インターフェースを再公開する */
export type { SocketBridgeTarget } from "./socketEventBridge";
