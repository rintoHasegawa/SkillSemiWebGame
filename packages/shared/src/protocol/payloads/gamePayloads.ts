/**
 * gamePayloads
 * ゲーム進行イベントで利用するペイロード型を定義する
 * プレイヤー差分，マップ差分，開始終了系の契約を集約する
 */
import type { TickData } from "../../domains/game/game.type";
import type { MovePayload as PlayerMovePayload, PlayerData } from "../../domains/player/player.type";

/** GAME_RESULT イベントで送受信するランキング1行 */
export type GameResultRanking = {
  rank: number;
  teamId: number;
  teamName: string;
  paintRate: number;
};

/** GAME_RESULT イベントで送受信する最終結果 */
export type GameResultPayload = {
  rankings: GameResultRanking[];
};

/** UPDATE_PLAYERS イベントで送受信するプレイヤー差分配列 */
export type UpdatePlayersPayload = TickData["playerUpdates"];

/** CURRENT_PLAYERS イベントで送受信するプレイヤー一覧 */
export type CurrentPlayersPayload = TickData["playerUpdates"];

/** UPDATE_MAP_CELLS イベントで送受信するマップ差分配列 */
export type UpdateMapCellsPayload = TickData["cellUpdates"];

/** NEW_PLAYER イベントで送受信するプレイヤー情報 */
export type NewPlayerPayload = PlayerData;

/** REMOVE_PLAYER イベントで送受信するプレイヤーID */
export type RemovePlayerPayload = PlayerData["id"];

/** GAME_START イベントで送受信するゲーム開始情報 */
export type GameStartPayload = { startTime: number };

/** MOVE イベントで送受信する移動入力情報 */
export type MovePayload = PlayerMovePayload;

/** PLACE_BOMB イベントで送受信する爆弾設置要求 */
export type PlaceBombPayload = {
  requestId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/** BOMB_PLACED イベントで送受信する爆弾確定情報 */
export type BombPlacedPayload = PlaceBombPayload & {
  bombId: string;
  ownerId: string;
};
