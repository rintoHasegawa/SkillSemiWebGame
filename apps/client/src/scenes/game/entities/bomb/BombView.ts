/**
 * BombView
 * 爆弾の描画責務を担うビュー
 * 設置中の見た目と爆風円の表示を管理する
 */
import { Container, Graphics } from "pixi.js";
import { Assets, Sprite, Texture } from "pixi.js";
import { config } from "@client/config";
import type { BombState } from "./BombModel";

/** 爆弾の描画表現を管理するビュー */
export class BombView {
  public readonly displayObject: Container;
  private static bombTexturePromise: Promise<Texture> | null = null;
  private static bombTexture: Texture | null = null;

  private bombSprite: Sprite;
  private bombFallbackGraphic: Graphics;
  private explosionGraphic: Graphics;
  private lastRenderedState: BombState | null = null;
  private lastRenderedRadiusGrid: number | null = null;
  private lastRenderedColor: number | null = null;
  private isBombTextureReady = false;
  private isDestroyed = false;

  constructor() {
    this.displayObject = new Container();
    this.displayObject.zIndex = 1000;
    this.bombSprite = new Sprite(Texture.WHITE);
    this.bombSprite.anchor.set(0.5, 0.5);
    this.bombSprite.visible = false;
    this.bombFallbackGraphic = new Graphics();
    this.bombFallbackGraphic.visible = false;
    this.explosionGraphic = new Graphics();

    this.displayObject.addChild(this.explosionGraphic);
    this.displayObject.addChild(this.bombFallbackGraphic);
    this.displayObject.addChild(this.bombSprite);

    void this.applyBombTexture();
  }

  private async applyBombTexture(): Promise<void> {
    const imageUrl = `${import.meta.env.BASE_URL}Bomb.svg`;

    try {
      const texture = await BombView.loadBombTexture(imageUrl);
      if (this.isDestroyed || this.bombSprite.destroyed) {
        return;
      }

      this.bombSprite.texture = texture;
      this.isBombTextureReady = true;
    } catch (error) {
      if (this.isDestroyed) {
        return;
      }

      this.isBombTextureReady = false;
      console.error(`[BombView] Bomb.svg 読み込み失敗: ${imageUrl}`, error);
    }
  }

  /** 爆弾テクスチャを共有キャッシュ経由で取得する */
  private static async loadBombTexture(imageUrl: string): Promise<Texture> {
    if (BombView.bombTexture) {
      return BombView.bombTexture;
    }

    if (!BombView.bombTexturePromise) {
      BombView.bombTexturePromise = Assets.load<Texture>(imageUrl).catch(
        (error: unknown) => {
          // 失敗した Promise を残すと再ロードできなくなるためキャッシュを破棄する
          BombView.bombTexturePromise = null;
          throw error;
        },
      );
    }

    const loadedTexture = await BombView.bombTexturePromise;
    BombView.bombTexture = loadedTexture;
    return loadedTexture;
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
      this.lastRenderedColor === color &&
      state !== "armed"
    ) {
      return;
    }

    const { GRID_CELL_SIZE, BOMB_RENDER_RADIUS_PX } = config.GAME_CONFIG;
    const bombRadiusPx = BOMB_RENDER_RADIUS_PX;
    const explosionRadiusPx = radiusGrid * GRID_CELL_SIZE;

    this.lastRenderedState = state;
    this.lastRenderedRadiusGrid = radiusGrid;
    this.lastRenderedColor = color;

    this.explosionGraphic.clear();
    this.bombFallbackGraphic.clear();

    if (state === "armed") {
      this.bombSprite.visible = this.isBombTextureReady;
      this.bombSprite.tint = 0xffffff;
      this.bombSprite.alpha = 1;
      this.bombSprite.width = bombRadiusPx * 2;
      this.bombSprite.height = bombRadiusPx * 2;

      this.bombFallbackGraphic.visible = true;
      this.bombFallbackGraphic.circle(0, 0, bombRadiusPx);
      this.bombFallbackGraphic.fill({ color, alpha: 0.92 });
      this.bombFallbackGraphic.stroke({ color: 0xffffff, width: 3 });
      return;
    }

    if (state === "exploded") {
      this.bombSprite.visible = false;
      this.bombFallbackGraphic.visible = false;
      this.explosionGraphic.circle(0, 0, explosionRadiusPx);
      this.explosionGraphic.fill({ color, alpha: 0.35 });
      this.explosionGraphic.stroke({ color, width: 3 });
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.displayObject.destroy({ children: true });
  }
}
