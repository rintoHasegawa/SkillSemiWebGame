/**
 * tick.type
 * ゲーム進行のtick同期で利用する共有型を定義する
 */
import type { CellUpdate } from "../gridMap/gridMap.type";
import type { PlayerData } from "../player/player.type";

/** 1ティックで配信するプレイヤー座標差分 */
export type PlayerPositionUpdate = Pick<PlayerData, "id" | "x" | "y">;

/** 1ティック分のプレイヤー差分更新とマップ差分を表す共有データ */
export interface TickData {
  playerUpdates: PlayerPositionUpdate[];
  cellUpdates: CellUpdate[];
}
