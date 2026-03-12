/**
 * HurricaneOverlayController
 * ハリケーン状態配列を受け取り，Pixi描画オブジェクトへ反映する
 * 生成，更新，削除を同一コントローラーで管理する
 */
import type { UpdateHurricanesPayload } from "@repo/shared";
import { config } from "@client/config";
import { Container, Sprite, Texture } from "pixi.js";
import { loadHurricaneTexture } from "./HurricaneTextureCache";

type HurricaneDisplay = {
  container: Container;
  sprite: Sprite;
  radiusGrid: number;
};

/** ハリケーン描画オーバーレイを管理する */
export class HurricaneOverlayController {
  private readonly layer: Container;
  private readonly displayById = new Map<string, HurricaneDisplay>();
  private readonly imageUrl = `${import.meta.env.BASE_URL}hurricane.svg`;

  constructor(worldContainer: Container) {
    this.layer = new Container();
    this.layer.sortableChildren = false;
    worldContainer.addChild(this.layer);
  }

  /** ハリケーン状態を描画へ同期する */
  public applyUpdates(states: UpdateHurricanesPayload): void {
    const activeIds = new Set<string>();

    states.forEach((state) => {
      activeIds.add(state.id);

      let target = this.displayById.get(state.id);
      if (!target) {
        const created = this.createDisplay();
        this.layer.addChild(created.container);
        this.displayById.set(state.id, created);
        target = created;
      }

      if (Math.abs(target.radiusGrid - state.radius) > 0.0001) {
        this.applySpriteSize(target.sprite, state.radius);
        target.radiusGrid = state.radius;
      }

      target.container.x = state.x * config.GAME_CONFIG.GRID_CELL_SIZE;
      target.container.y = state.y * config.GAME_CONFIG.GRID_CELL_SIZE;
      target.container.rotation = state.rotationRad;
    });

    this.displayById.forEach((display, id) => {
      if (activeIds.has(id)) {
        return;
      }

      this.layer.removeChild(display.container);
      display.container.destroy({ children: true });
      this.displayById.delete(id);
    });
  }

  /** 描画リソースを破棄する */
  public destroy(): void {
    this.displayById.forEach((display) => {
      this.layer.removeChild(display.container);
      display.container.destroy({ children: true });
    });
    this.displayById.clear();
    this.layer.destroy({ children: true });
  }

  private createDisplay(): HurricaneDisplay {
    const container = new Container();
    const sprite = new Sprite(Texture.WHITE);
    sprite.anchor.set(0.5, 0.5);
    this.applySpriteSize(sprite, 0);
    container.addChild(sprite);

    void this.applyTexture(sprite);

    return {
      container,
      sprite,
      radiusGrid: 0,
    };
  }

  /** ハリケーン画像を読み込んでスプライトへ適用する */
  private async applyTexture(sprite: Sprite): Promise<void> {
    try {
      const texture = await loadHurricaneTexture(this.imageUrl);
      sprite.texture = texture;
    } catch {
      // 読み込み失敗時は白テクスチャのまま描画を継続する
    }
  }

  /** 当たり判定半径に一致する見た目サイズを適用する */
  private applySpriteSize(sprite: Sprite, radiusGrid: number): void {
    const sizePx = this.toSpriteSizePx(radiusGrid);
    sprite.width = sizePx;
    sprite.height = sizePx;
  }

  /** 半径グリッド値をスプライト直径ピクセルへ変換する */
  private toSpriteSizePx(radiusGrid: number): number {
    return radiusGrid * 2 * config.GAME_CONFIG.GRID_CELL_SIZE;
  }
}
