/**
 * fullMapCellUpdatesBuilder
 * マップ全体の塗り状態を差分配信と同じ CellUpdate 形式へ変換する
 * 途中合流したソケットへ現在のマップを一括同期するために利用する
 */
import { domain } from "@repo/shared";

/** 未塗装セルを表す teamId */
const UNPAINTED_TEAM_ID = -1;

/**
 * 塗り状態ビューから未塗装でないセルのみを CellUpdate 配列へ変換する
 * 未塗装セルは受信側の初期状態と同じため送らない
 */
export const buildFullMapCellUpdates = (
  gridColors: readonly number[],
): domain.game.gridMap.CellUpdate[] => {
  const cellUpdates: domain.game.gridMap.CellUpdate[] = [];

  gridColors.forEach((teamId, index) => {
    if (teamId === UNPAINTED_TEAM_ID) {
      return;
    }

    cellUpdates.push({ index, teamId });
  });

  return cellUpdates;
};
