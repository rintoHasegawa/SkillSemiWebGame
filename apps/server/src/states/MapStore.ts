// apps/server/src/states/MapStore.ts
import type { CellUpdate } from "@repo/shared/src/domains/gridMap/gridMap.type";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

export class MapStore {
  // 全マスの現在の色（teamId）を保持
  private gridColors: number[];
  // 次回の送信ループで送る差分リスト
  private pendingUpdates: CellUpdate[];

  constructor() {
    // 初期状態は -1 (無色) などで初期化
    const totalCells = GAME_CONFIG.GRID_COLS * GAME_CONFIG.GRID_ROWS;
    this.gridColors = new Array(totalCells).fill(-1);
    this.pendingUpdates = [];
  }

  /**
   * マスを塗り、色が変化した場合のみ差分キューに追加する
   */
  public paintCell(index: number, teamId: number): void {
    if (this.gridColors[index] !== teamId) {
      this.gridColors[index] = teamId;
      this.pendingUpdates.push({ index, teamId });
    }
  }

  /**
   * 溜まっている差分を取得し、キューをクリアする（ループ送信時に使用）
   */
  public getAndClearUpdates(): CellUpdate[] {
    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];
    return updates;
  }
}