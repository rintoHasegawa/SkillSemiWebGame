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
/** 円当たり判定サブドメインを再公開する */
export * as collision from "./collision";
/** 爆弾当たり判定サブドメインを再公開する */
export * as bombHit from "./bombHit";
/** 爆弾設置ルールサブドメインを再公開する */
export * as bomb from "./bomb";
/** AOIサブドメインを再公開する */
export * as aoi from "./aoi";
