/**
 * index
 * domains 配下の公開要素を集約して再公開する
 * ドメイン単位で参照できる安定公開面を提供する
 */

/** app ドメインを再公開する */
export * as app from "./app";
/** game ドメインを再公開する */
export * as game from "./game";
/** room ドメインを再公開する */
export * as room from "./room";

/** 後方互換: game 配下へ移動した player を旧パスでも公開する */
export * as player from "./game/player";
/** 後方互換: game 配下へ移動した gridMap を旧パスでも公開する */
export * as gridMap from "./game/gridMap";
