/**
 * index
 * botサービス群の公開APIを再エクスポートする
 */

/** Botの1tick分の意思決定オーケストレータを再公開 */
export { BotTurnOrchestrator } from "./orchestrators/BotTurnOrchestrator.js";

/** BotプレイヤーID判定関数を再公開 */
export { isBotPlayerId } from "./roster/BotRosterService.js";

/** BotプレイヤーID補完関数を再公開 */
export { createBalancedSessionPlayerIds } from "./roster/BotRosterService.js";

/** BotプレイヤーID型を再公開 */
export type { BotPlayerId } from "./roster/BotRosterService.js";

/** Bot爆弾アクションハンドラ生成関数を再公開 */
export { createBotBombActionHandler } from "./adapters/BotBombActionAdapter.js";
