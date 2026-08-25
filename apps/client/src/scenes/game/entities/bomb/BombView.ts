/**
 * BombView
 * 爆弾の描画責務を担うビュー
 * 設置中の見た目と爆風円，爆発までの残り時間リングゲージの表示を管理する
 */
import { Container, Graphics } from "pixi.js";
import { Assets, Sprite, Texture } from "pixi.js";
import { config } from "@client/config";
import type { BombState } from "./BombModel";

// リングゲージは12時方向を起点に時計回りで減っていく
const FUSE_GAUGE_START_ANGLE = -Math.PI / 2;
const FULL_TURN_ANGLE = Math.PI * 2;

/** 爆弾の描画表現を管理するビュー */
export class BombView {
  public readonly displayObject: Container;
  private static bombTexturePromise: Promise<Texture> | null = null;
  private static bombTexture: Texture | null = null;

  private bombSprite: Sprite;
  private bombFallbackGraphic: Graphics;
  private explosionGraphic: Graphics;
  private fuseGaugeGraphic: Graphics;
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
    this.fuseGaugeGraphic = new Graphics();
    this.fuseGaugeGraphic.visible = false;

    // 爆風円より上，爆弾スプライトより下の重なりになるよう追加順を保つ
    this.displayObject.addChild(this.explosionGraphic);
    this.displayObject.addChild(this.fuseGaugeGraphic);
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

  /** 残り時間リングゲージを描画する（armed 中のみ呼ぶ） */
  public renderFuseGauge(remainingRatio: number, color: number): void {
    const { BOMB_FUSE_GAUGE, BOMB_FUSE_GAUGE_RADIUS_PX } = config.GAME_CONFIG;
    const clampedRatio = Math.min(1, Math.max(0, remainingRatio));

    this.fuseGaugeGraphic.visible = true;
    this.fuseGaugeGraphic.clear();

    // 残り量を読み取れるよう全周のトラックを下敷きにする
    this.fuseGaugeGraphic.circle(0, 0, BOMB_FUSE_GAUGE_RADIUS_PX);
    this.fuseGaugeGraphic.stroke({
      color: BOMB_FUSE_GAUGE.TRACK_COLOR,
      width: BOMB_FUSE_GAUGE.THICKNESS_PX,
      alpha: BOMB_FUSE_GAUGE.TRACK_ALPHA,
    });

    if (clampedRatio <= 0) return;

    // 起点から残り比率ぶんの弧を描く
    const endAngle = FUSE_GAUGE_START_ANGLE + clampedRatio * FULL_TURN_ANGLE;
    const outlineWidth =
      BOMB_FUSE_GAUGE.THICKNESS_PX + BOMB_FUSE_GAUGE.OUTLINE_WIDTH_PX * 2;

    // 太い白弧の上に細いチーム色弧を重ねて縁取りを表現する
    this.strokeFuseArc(FUSE_GAUGE_START_ANGLE, endAngle, {
      color: BOMB_FUSE_GAUGE.OUTLINE_COLOR,
      width: outlineWidth,
    });
    this.strokeFuseArc(FUSE_GAUGE_START_ANGLE, endAngle, {
      color,
      width: BOMB_FUSE_GAUGE.THICKNESS_PX,
    });
  }

  /** 残り時間リングゲージを非表示にする */
  public hideFuseGauge(): void {
    if (!this.fuseGaugeGraphic.visible) return;

    this.fuseGaugeGraphic.visible = false;
    this.fuseGaugeGraphic.clear();
  }

  // 直前のパス終端から弦が引かれないよう弧の始点へ移動してからストロークする
  private strokeFuseArc(
    startAngle: number,
    endAngle: number,
    style: { color: number; width: number },
  ): void {
    const radiusPx = config.GAME_CONFIG.BOMB_FUSE_GAUGE_RADIUS_PX;

    this.fuseGaugeGraphic.moveTo(
      Math.cos(startAngle) * radiusPx,
      Math.sin(startAngle) * radiusPx,
    );
    this.fuseGaugeGraphic.arc(0, 0, radiusPx, startAngle, endAngle);
    this.fuseGaugeGraphic.stroke({ ...style, alpha: 1 });
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.displayObject.destroy({ children: true });
  }
}
