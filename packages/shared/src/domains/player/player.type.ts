/**
 * player.type
 * プレイヤー領域で利用する共有型を定義する
 * クライアントとサーバーで参照する契約を集約する
 */

/** クライアントとサーバー間で共有するプレイヤー基本情報 */
export type PlayerOwnerType = "human" | "bot";

/** クライアントとサーバー間で共有するプレイヤー基本情報 */
export interface PlayerData {
  id: string;
  name: string;
  ownerType: PlayerOwnerType;
  // グリッド単位の座標
  x: number;
  y: number;
  teamId: number; // 0〜3 のチームID
}

/** MOVE イベントで利用する移動入力ペイロード */
export interface MovePayload {
  // グリッド単位の座標
  x: number;
  y: number;
}
