/**
 * logEvents
 * ログ関連の定数と型契約を集約して再公開する
 */

/** ログスコープ定数と型を再公開 */
export { logScopes } from "./logScopes";
export type { LogScope } from "./logScopes";

/** ログイベント定数群を再公開 */
export {
  gameUseCaseLogEvents,
  roomUseCaseLogEvents,
  gameDomainLogEvents,
  roomDomainLogEvents,
} from "./logEventGroups";

/** ログ結果値定数を再公開 */
export { logResults } from "./logResults";

/** ログペイロード契約型を再公開 */
export type { LogPayloadByScope, LogPayloadOf } from "./logPayloadContracts";
