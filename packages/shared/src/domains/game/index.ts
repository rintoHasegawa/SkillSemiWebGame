/**
 * index
 * game ドメインの公開要素を集約して再公開する
 * ゲーム進行で利用する型を外部利用向けに束ねる
 */

/** ゲーム進行関連の型を再公開する */
export type { PlayerPositionUpdate, TickData } from "./game.type";
