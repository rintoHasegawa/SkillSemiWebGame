/**
 * index
 * identity配下の公開APIを集約して再公開する
 */

/** ソケットIDとプレイヤーIDの対応レジストリを再公開する */
export { PlayerIdentityRegistry } from "./PlayerIdentityRegistry";

/** 現在のプレイヤーIDを都度解決する関数の生成器と，その型を再公開する */
export {
  createCurrentPlayerIdResolver,
  type CurrentPlayerIdResolver,
} from "./PlayerIdentityRegistry";

/** 復帰用のセッション予約レジストリを再公開する */
export { SessionReservationRegistry } from "./SessionReservationRegistry";

/** 復帰用のセッション予約情報型を再公開する */
export type { SessionReservationEntry } from "./SessionReservationRegistry";

/** ハンドシェイクのセッショントークン解決関数を再公開する */
export { resolveSessionToken } from "./sessionToken";
