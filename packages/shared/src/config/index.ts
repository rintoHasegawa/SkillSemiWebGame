/**
 * index
 * 共有設定値を集約して再公開するエントリ
 * ゲーム設定とネットワーク設定の参照口を一本化する
 */

/** ゲーム全体の共有設定値を再公開する */
export { GAME_CONFIG } from "./gameConfig";
/** チーム名配列を再公開する */
export { TEAM_NAMES } from "./gameConfig";
/** 未確定 teamId の既定値を再公開する */
export { UNKNOWN_TEAM_ID } from "./gameConfig";
/** チーム設定関連の検証関数を再公開する */
export {
	validateTeamConfig,
	assertValidTeamId,
	isUnknownTeamId,
	isKnownTeamId,
} from "./gameConfig";
/** ネットワーク共有設定値を再公開する */
export { NETWORK_CONFIG } from "./networkConfig";
