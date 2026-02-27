/**
 * index
 * registration配下の公開APIを集約して再公開する
 */

/** ソケット受信イベント登録コンテキストを再公開する */
export {
  createSocketRegistrationContext,
} from "./createSocketRegistrationContext";

/** 接続イベント登録コンテキストを再公開する */
export {
  createConnectionRegistrationContext,
} from "./createConnectionRegistrationContext";
