/**
 * mapContestResolver
 * 同一セルに複数チームが重なった場合の競合判定を提供する
 * 純粋関数として切り出し，単体テストを容易にする
 */

/** 同一セルに異なるチームが存在していることを示すセンチネル値 */
export const CONTESTED_CELL = -2;

/** プレイヤーごとのグリッド位置情報 */
export type PlayerGridEntry = {
  playerId: string;
  gridIndex: number | null;
  teamId: number;
};

/**
 * 各セルの占有チームを判定し，競合セルは CONTESTED_CELL でマークする
 * @returns セルインデックス → チームID（競合時は CONTESTED_CELL）のマップ
 */
export const resolveUncontestedCells = (
  entries: PlayerGridEntry[],
): Map<number, number> => {
  const cellTeamMap = new Map<number, number>();

  for (const { gridIndex, teamId } of entries) {
    if (gridIndex === null) continue;

    const existing = cellTeamMap.get(gridIndex);
    if (existing === undefined) {
      cellTeamMap.set(gridIndex, teamId);
    } else if (existing !== CONTESTED_CELL && existing !== teamId) {
      cellTeamMap.set(gridIndex, CONTESTED_CELL);
    }
  }

  return cellTeamMap;
};

/** 指定セルが塗り可能（競合でない）かを判定する */
export const isCellPaintable = (
  cellTeamMap: Map<number, number>,
  gridIndex: number,
): boolean => {
  const ownerTeamId = cellTeamMap.get(gridIndex);
  return ownerTeamId !== undefined && ownerTeamId !== CONTESTED_CELL;
};
