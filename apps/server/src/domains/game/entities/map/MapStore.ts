/**
 * MapStore
 * 塗り状態グリッドと差分更新キューを保持して提供する
 */
import { domain } from "@repo/shared";
import { createInitialGridColors } from "./mapGrid.js";
import { paintCellIfChanged } from "./mapPainting.js";

/** ルーム内マップの塗り状態と更新差分を管理するストア */
export class MapStore {
  // 全マスの現在の色（teamId）を保持
  private gridColors: number[];
  // 次回の送信ループで送る差分リスト
  private pendingUpdates: domain.game.gridMap.CellUpdate[];

  constructor() {
    // 初期状態は -1 (無色) などで初期化
    this.gridColors = createInitialGridColors();
    this.pendingUpdates = [];
  }

  /**
    * マスを塗り，色が変化した場合のみ差分キューに追加する
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
    * 溜まっている差分を取得し，キューをクリアする（ループ送信時に使用）
    * 参照をそのまま返却し新しい空配列で差し替えることでコピーを回避する
   */
  public getAndClearUpdates(): domain.game.gridMap.CellUpdate[] {
    const updates = this.pendingUpdates;
    this.pendingUpdates = [];
    return updates;
  }

  /** 現在のマップ塗り状態をスナップショットとして返す */
  public getGridColorsSnapshot(): number[] {
    return [...this.gridColors];
  }
}