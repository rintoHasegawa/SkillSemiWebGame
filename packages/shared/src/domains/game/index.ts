/**
 * index
 * game ドメインの公開要素を集約して再公開する
 * ゲーム進行配下のサブドメインを外部利用向けに束ねる
 */

/** tick同期サブドメインを再公開する */
export * as tick from "./tick";
/** プレイヤーサブドメインを再公開する */
export * as player from "./player";
/** グリッドマップサブドメインを再公開する */
export * as gridMap from "./gridMap";
/** 爆弾当たり判定サブドメインを再公開する */
export * as bombHit from "./bombHit";
