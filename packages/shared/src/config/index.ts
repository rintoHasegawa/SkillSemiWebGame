/**
 * index
 * 共有設定値を集約して再公開するエントリ
 * ゲーム設定とネットワーク設定の参照口を一本化する
 */

/** ゲーム全体の共有設定値を再公開する */
export { GAME_CONFIG } from "./gameConfig";
/** フィールドサイズ種別から実グリッドサイズを解決する関数を再公開する */
export { resolveFieldGridSize } from "./gameConfig";
/** フィールドサイズ種別の判定関数を再公開する */
export { isFieldSizePreset } from "./gameConfig";
/** 全フィールドサイズ種別中で最大のグリッドサイズを再公開する */
export { MAX_FIELD_GRID_SIZE } from "./gameConfig";
/** フィールドサイズ種別のキー型を再公開する */
export type { FieldSizePreset } from "./gameConfig";
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
} from "./teamValidators";
/** ネットワーク共有設定値を再公開する */
export { NETWORK_CONFIG } from "./networkConfig";
