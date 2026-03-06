/**
 * playerHitEffectPayloads
 * プレイヤー被弾演出で利用するイベント型を定義する
 * クライアントとサーバーで共有する語彙を提供する
 */

/** ローカル被弾演出イベントのペイロード型 */
export type LocalBombHitEffectPayload = {
  playerId: string;
  localPlayerId: string;
};

/** ネットワーク通知由来の被弾演出イベントのペイロード型 */
export type NetworkPlayerHitEffectPayload = {
  playerId: string;
  localPlayerId: string;
};

/** 被弾演出イベント名ごとのペイロード対応表 */
export type PlayerHitEffectEventPayloadMap = {
  "local-bomb-hit": LocalBombHitEffectPayload;
  "network-player-hit": NetworkPlayerHitEffectPayload;
};

/** 被弾演出イベント名を表す型 */
export type PlayerHitEffectEventName = keyof PlayerHitEffectEventPayloadMap;

/** 被弾演出イベント名からペイロード型を取得するユーティリティ型 */
export type PlayerHitEffectPayloadOf<TEvent extends PlayerHitEffectEventName> =
  PlayerHitEffectEventPayloadMap[TEvent];
