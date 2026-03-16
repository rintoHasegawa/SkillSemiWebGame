/**
 * hurricaneTypes
 * ハリケーン処理で共有する型を定義する
 */
import type { HurricaneStatePayload } from "@repo/shared";

/** ハリケーンの内部状態 */
export type HurricaneState = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotationRad: number;
};

/** マップ境界サイズ */
export type MapGridSize = {
  gridCols: number;
  gridRows: number;
};

/** 差分判定用の量子化スナップショット */
export type HurricaneSyncSnapshot = {
  x: number;
  y: number;
  radius: number;
  rotationRad: number;
};

/** 1ティック分のハリケーン同期出力 */
export type HurricaneSyncOutputs = {
  snapshotUpdates: HurricaneStatePayload[];
  deltaUpdates: HurricaneStatePayload[];
};
