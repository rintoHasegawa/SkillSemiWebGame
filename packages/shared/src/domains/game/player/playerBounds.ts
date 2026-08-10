/**
 * playerBounds
 * プレイヤー座標をマップ範囲内へ収めるクランプ計算を提供する
 * クライアントとサーバーで同一の境界式を共有し同期ズレを防ぐ
 */
import { GAME_CONFIG } from "../../../config/gameConfig";
import type { MovePayload } from "./player.type";

/** 座標クランプで基準にするマップサイズ（グリッド単位） */
export type MapBoundsSize = {
  gridCols: number;
  gridRows: number;
};

// 1軸ぶんの座標をプレイヤー半径を考慮した範囲へ収める
const clampAxis = (value: number, size: number): number => {
  const safeSize = Number.isFinite(size) && size > 0 ? size : 0;
  const min = GAME_CONFIG.PLAYER_RADIUS;
  const max = safeSize - GAME_CONFIG.PLAYER_RADIUS;

  // プレイヤー直径を収められないマップでは中央へ寄せる
  if (max <= min) {
    return safeSize / 2;
  }

  // NaN は境界比較が成立しないため中央へフォールバックする
  if (Number.isNaN(value)) {
    return safeSize / 2;
  }

  return Math.min(Math.max(value, min), max);
};

/** プレイヤー座標をマップ範囲内（半径ぶん内側）へクランプする */
export const clampPositionToMapBounds = (
  position: Readonly<MovePayload>,
  size?: Readonly<MapBoundsSize>,
): MovePayload => {
  const gridCols = size?.gridCols ?? GAME_CONFIG.GRID_COLS;
  const gridRows = size?.gridRows ?? GAME_CONFIG.GRID_ROWS;

  return {
    x: clampAxis(position.x, gridCols),
    y: clampAxis(position.y, gridRows),
  };
};
