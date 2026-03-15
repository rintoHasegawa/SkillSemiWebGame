/**
 * index
 * player サブドメインの公開要素を集約して再公開する
 * プレイヤー契約で利用する型を外部利用向けに束ねる
 */

/** プレイヤー契約関連の型を再公開する */
export type { PlayerData, MovePayload } from "./player.type";
/** MOVE ペイロード送信の正規化関数を再公開する */
export {
	DEFAULT_MOVE_QUANTIZE_SCALE,
	quantizeMovePayload,
	isSameMovePayload,
} from "./moveSync";
