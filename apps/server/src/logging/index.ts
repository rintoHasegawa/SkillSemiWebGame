/**
 * index
 * logging配下の公開APIを集約して再公開する
 */

/** ログスコープ定数と型を再公開 */
export { logScopes } from "./constants/scopes";

/** ログ結果値定数を再公開 */
export { logResults } from "./constants/results";

/** ログイベント名定数群を再公開 */
export {
  gameUseCaseLogEvents,
  roomUseCaseLogEvents,
  gameDomainLogEvents,
  roomDomainLogEvents,
} from "./constants/eventNames";
