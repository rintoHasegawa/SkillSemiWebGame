/**
 * BombView
 * 爆弾の描画責務を担うビュー
 * 設置中の見た目と爆風円の表示を管理する
 */
import { Container, Graphics } from "pixi.js";
import { config } from "@client/config";
import type { BombState } from "./BombModel";

/** 爆弾の描画表現を管理するビュー */
export class BombView {
  public readonly displayObject: Container;

  private bombGraphic: Graphics;
  private explosionGraphic: Graphics;
  private lastRenderedState: BombState | null = null;
  private lastRenderedRadiusGrid: number | null = null;
  private lastRenderedColor: number | null = null;

  constructor() {
    this.displayObject = new Container();
    this.bombGraphic = new Graphics();
    this.explosionGraphic = new Graphics();

    this.displayObject.addChild(this.explosionGraphic);
    this.displayObject.addChild(this.bombGraphic);
  }

  public syncPosition(gridX: number, gridY: number): void {
    const { GRID_CELL_SIZE } = config.GAME_CONFIG;

    this.displayObject.x = gridX * GRID_CELL_SIZE;
    this.displayObject.y = gridY * GRID_CELL_SIZE;
  }

  public renderState(
    state: BombState,
    radiusGrid: number,
    color: number,
  ): void {
    if (
      this.lastRenderedState === state &&
      this.lastRenderedRadiusGrid === radiusGrid &&
      this.lastRenderedColor === color
    ) {
      return;
    }

    const { GRID_CELL_SIZE } = config.GAME_CONFIG;
    const bombRadiusPx = GRID_CELL_SIZE * 0.2;
    const explosionRadiusPx = radiusGrid * GRID_CELL_SIZE;

    this.lastRenderedState = state;
    this.lastRenderedRadiusGrid = radiusGrid;
    this.lastRenderedColor = color;

    this.bombGraphic.clear();
    this.explosionGraphic.clear();

    if (state === "armed") {
      this.bombGraphic.circle(0, 0, bombRadiusPx);
      this.bombGraphic.fill({ color, alpha: 0.95 });
      this.bombGraphic.stroke({ color: 0xffffff, width: 2 });
      return;
    }

    if (state === "exploded") {
      this.explosionGraphic.circle(0, 0, explosionRadiusPx);
      this.explosionGraphic.fill({ color, alpha: 0.35 });
      this.explosionGraphic.stroke({ color, width: 3 });
    }
  }

  public destroy(): void {
    this.displayObject.destroy({ children: true });
  }
}
