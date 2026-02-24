// apps/server/src/domains/game/entities/map/MapStore.ts
import type { gridMapTypes } from "@repo/shared";
import { createInitialGridColors } from "./mapGrid.js";
import { paintCellIfChanged } from "./mapPainting.js";
import { drainPendingUpdates } from "./mapUpdates.js";

export class MapStore {
  // 全マスの現在の色（teamId）を保持
  private gridColors: number[];
  // 次回の送信ループで送る差分リスト
  private pendingUpdates: gridMapTypes.CellUpdate[];

  constructor() {
    // 初期状態は -1 (無色) などで初期化
    this.gridColors = createInitialGridColors();
    this.pendingUpdates = [];
  }

  /**
   * マスを塗り、色が変化した場合のみ差分キューに追加する
   */
  public paintCell(index: number, teamId: number): void {
    paintCellIfChanged({
      gridColors: this.gridColors,
      pendingUpdates: this.pendingUpdates,
      index,
      teamId,
    });
  }

  /**
   * 溜まっている差分を取得し、キューをクリアする（ループ送信時に使用）
   */
  public getAndClearUpdates(): gridMapTypes.CellUpdate[] {
    return drainPendingUpdates(this.pendingUpdates);
  }
}