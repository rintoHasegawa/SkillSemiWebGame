/**
 * gamePayloads
 * ゲーム進行イベントで利用するペイロード型を定義する
 * プレイヤー差分，マップ差分，開始終了系の契約を集約する
 */
import type { PlayerPositionUpdate } from "../../domains/game/game.type";
import type { CellUpdate } from "../../domains/gridMap/gridMap.type";
import type {
  MovePayload as PlayerMovePayload,
  PlayerData,
} from "../../domains/player/player.type";

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

/**
 * 初期同期（CURRENT_PLAYERS）で利用するプレイヤー一覧
 * 初期同期用のため teamId を含む完全な PlayerData を配信する
 */
export type InitialPlayerSyncPayload = PlayerData[];

/**
 * 差分同期（UPDATE_PLAYERS）で利用するプレイヤー差分配列
 * 帯域最適化のため teamId は含めず，id/x/y のみを配信する
 */
export type DeltaPlayerSyncPayload = PlayerPositionUpdate[];

/** UPDATE_PLAYERS イベントで送受信するプレイヤー差分配列 */
export type UpdatePlayersPayload = DeltaPlayerSyncPayload;

/** CURRENT_PLAYERS イベントで送受信するプレイヤー一覧 */
export type CurrentPlayersPayload = InitialPlayerSyncPayload;

/** UPDATE_MAP_CELLS イベントで送受信するマップ差分配列 */
export type UpdateMapCellsPayload = CellUpdate[];

/**
 * NEW_PLAYER イベントで送受信するプレイヤー情報
 * 初回参加通知のため teamId を含む完全な PlayerData を配信する
 */
export type NewPlayerPayload = PlayerData;

/** REMOVE_PLAYER イベントで送受信するプレイヤーID */
export type RemovePlayerPayload = PlayerData["id"];

/** GAME_START イベントで送受信するゲーム開始情報 */
export type GameStartPayload = { startTime: number };

/** START_GAME イベントで受信するゲーム開始要求 */
export type StartGameRequestPayload = {
  targetPlayerCount?: number;
};

/** MOVE イベントで送受信する移動入力情報 */
export type MovePayload = PlayerMovePayload;

/** PLACE_BOMB イベントで送受信する爆弾設置要求 */
export type PlaceBombPayload = {
  requestId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/** BOMB_PLACED イベントで送受信する他プレイヤー向け爆弾確定情報，設置者識別は ownerSocketId で扱う */
export type BombPlacedPayload = {
  bombId: string;
  ownerSocketId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/** BOMB_PLACED_ACK イベントで送受信する設置者向け確定情報 */
export type BombPlacedAckPayload = {
  bombId: string;
  requestId: string;
};

/** BOMB_HIT_REPORT イベントで送受信する被弾報告 */
export type BombHitReportPayload = {
  bombId: string;
};

/** PLAYER_DEAD イベントで送受信する死亡プレイヤー情報 */
export type PlayerDeadPayload = {
  playerId: string;
};
