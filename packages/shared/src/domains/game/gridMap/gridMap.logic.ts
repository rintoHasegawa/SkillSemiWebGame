import { GAME_CONFIG } from "../../../config/gameConfig";

/**
 * グリッド座標から1次元配列インデックスを取得する（中心点判定）
 */
export function getGridIndexFromPosition(x: number, y: number): number | null {
  const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;

  // 座標がどのマス（列・行）に属するか計算
  const col = Math.floor(x);
  const row = Math.floor(y);

  // マップ外の場合は null を返す
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
    return null;
  }

  // 1次元配列のインデックスに変換 (row * 幅 + col)
  return row * GRID_COLS + col;
}
