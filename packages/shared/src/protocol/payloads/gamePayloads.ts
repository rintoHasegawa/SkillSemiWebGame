/**
 * gamePayloads
 * ゲーム進行イベントで利用するペイロード型を定義する
 * プレイヤー差分，マップ差分，開始終了系の契約を集約する
 */
import type { PlayerPositionUpdate } from "../../domains/game/tick/tick.type";
import type { GroupedCellUpdates } from "../../domains/game/gridMap/gridMap.type";
import type {
  MovePayload as PlayerMovePayload,
  PlayerData,
} from "../../domains/game/player/player.type";
import type { FieldSizePreset } from "../../config/gameConfig";

/** start-game で利用するフィールドサイズ種別を再公開する型別名 */
export type { FieldSizePreset } from "../../config/gameConfig";

/** game-result イベントで送受信するランキング1行 */
export type GameResultRanking = {
  rank: number;
  teamId: number;
  teamName: string;
  paintRate: number;
};

/** game-result イベントで送受信するプレイヤー個人スタッツ */
export type PlayerGameStats = {
  playerId: string;
  playerName: string;
  teamId: number;
  /** セルの色を塗り替えた回数 */
  paintCount: number;
  /** 爆弾を敵に当てた回数 */
  bombHitCount: number;
};

/** game-result イベントで送受信する最終結果 */
export type GameResultPayload = {
  rankings: GameResultRanking[];
  /** ゲーム終了時点のマップ色配列，index はセル位置に対応する */
  finalGridColors?: number[];
  /** プレイヤー個人スタッツ一覧 */
  playerStats?: PlayerGameStats[];
};

/** current-players で配信するプレイヤー全体スナップショット */
export type PlayerSnapshotPayload = PlayerData[];

/**
 * update-players で配信するプレイヤー差分配列
 * 帯域最適化のため teamId は含めず，id/x/y のみを配信する
 */
export type PlayerDeltaPayload = PlayerPositionUpdate[];

/**
 * 初期同期（current-players）で利用するプレイヤー一覧
 * 初期同期用のため teamId を含む完全な PlayerData を配信する
 */
export type InitialPlayerSyncPayload = PlayerSnapshotPayload;

/**
 * 差分同期（update-players）で利用するプレイヤー差分配列
 * 帯域最適化のため teamId は含めず，id/x/y のみを配信する
 */
export type DeltaPlayerSyncPayload = PlayerDeltaPayload;

/** update-players イベントで送受信するプレイヤー差分配列 */
export type UpdatePlayersPayload = PlayerDeltaPayload;

/** current-players イベントで送受信するプレイヤー一覧 */
export type CurrentPlayersPayload = PlayerSnapshotPayload;

/** update-map-cells イベントで送受信するグループ化マップ差分 */
export type UpdateMapCellsPayload = GroupedCellUpdates;

/** update-hurricanes イベントで送受信するハリケーン状態 */
export type HurricaneStatePayload = {
  id: string;
  x: number;
  y: number;
  radius: number;
  rotationRad: number;
};

/** update-hurricanes イベントで送受信するハリケーン状態配列 */
export type HurricaneSnapshotPayload = HurricaneStatePayload[];

/** update-hurricanes イベントで送受信するハリケーン差分配列 */
export type HurricaneDeltaPayload = HurricaneStatePayload[];

/** update-hurricanes イベントで送受信するハリケーン差分配列（互換名） */
export type UpdateHurricanesPayload = HurricaneDeltaPayload;

/**
 * new-player イベントで送受信するプレイヤー情報
 * 初回参加通知のため teamId を含む完全な PlayerData を配信する
 */
export type NewPlayerPayload = PlayerData;

/** remove-player イベントで送受信するプレイヤーID */
export type RemovePlayerPayload = PlayerData["id"];

/** game-start イベントで送受信するゲーム開始情報 */
export type GameStartPayload = {
  /** ゲーム開始予定のUNIXタイムスタンプ（サーバー時計基準, ms） */
  startTime: number;
  /** ペイロード送信時のサーバー時刻（クライアント側クロックオフセット補正用, ms） */
  serverNow: number;
  /** 今回のゲームで採用するフィールドサイズ種別 */
  fieldSizePreset: FieldSizePreset;
};

/** start-game イベントで受信するゲーム開始要求 */
export type StartGameRequestPayload = {
  targetPlayerCount?: number;
  fieldSizePreset?: FieldSizePreset;
};

/** move イベントで送受信する移動入力情報 */
export type MovePayload = PlayerMovePayload;

/** place-bomb イベントで送受信する爆弾設置要求 */
export type PlaceBombPayload = {
  requestId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/** bomb-placed イベントで送受信する他プレイヤー向け爆弾確定情報，設置者識別は ownerSocketId で扱う */
export type BombPlacedPayload = {
  bombId: string;
  ownerSocketId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/** bomb-placed-ack イベントで送受信する設置者向け確定情報 */
export type BombPlacedAckPayload = {
  bombId: string;
  requestId: string;
};

/** bomb-hit-report イベントで送受信する被弾報告 */
export type BombHitReportPayload = {
  bombId: string;
};

/** player-hit イベントで送受信する被弾プレイヤー情報 */
export type PlayerHitPayload = {
  playerId: string;
};

/** hurricane-hit イベントで送受信する被弾プレイヤー情報 */
export type HurricaneHitPayload = {
  playerId: string;
};
