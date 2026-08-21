/**
 * HurricaneOverlayController
 * ハリケーン状態配列を受け取り，Pixi描画オブジェクトへ反映する
 * 生成，更新，削除を同一コントローラーで管理する
 */
import type { HurricaneStatePayload, UpdateHurricanesPayload } from "@repo/shared";
import { config } from "@client/config";
import { Container, Sprite, Texture } from "pixi.js";
import { loadHurricaneTexture } from "./HurricaneTextureCache";
import {
  isCircleBoundsIntersectingViewport,
  type WorldViewport,
} from "@client/scenes/game/application/culling/worldViewport";

type HurricaneDisplay = {
  container: Container;
  sprite: Sprite;
  radiusGrid: number;
};

/** ハリケーン描画オーバーレイを管理する */
export class HurricaneOverlayController {
  private readonly layer: Container;
  private readonly displayById = new Map<string, HurricaneDisplay>();
  private readonly stateById = new Map<string, HurricaneStatePayload>();
  private readonly imageUrl = `${import.meta.env.BASE_URL}hurricane.svg`;

  constructor(worldContainer: Container) {
    this.layer = new Container();
    this.layer.sortableChildren = false;
    worldContainer.addChild(this.layer);
  }

  /** ハリケーン状態を描画へ同期する */
  public applyUpdates(states: UpdateHurricanesPayload): void {
    states.forEach((state) => {
      this.stateById.set(state.id, state);

      let target = this.displayById.get(state.id);
      if (!target) {
        const created = this.createDisplay();
        this.layer.addChild(created.container);
        this.displayById.set(state.id, created);
        target = created;
      }

      if (!target.container.visible) {
        return;
      }

      this.renderDisplayFromState(target, state);
    });
  }

  /** 受信状態で全体を置換し，未含有IDを描画から除去する */
  public replaceAll(states: UpdateHurricanesPayload): void {
    const nextIds = new Set(states.map((state) => state.id));

    this.displayById.forEach((display, id) => {
      if (nextIds.has(id)) {
        return;
      }

      this.layer.removeChild(display.container);
      display.container.destroy({ children: true });
      this.displayById.delete(id);
      this.stateById.delete(id);
    });

    this.applyUpdates(states);
  }

  /** 可視矩形に基づいてハリケーン表示を切り替える */
  public applyViewportCulling(viewport: WorldViewport, marginPx: number): void {
    this.stateById.forEach((state, id) => {
      const display = this.displayById.get(id);
      if (!display) {
        return;
      }

      const centerX = state.x * config.GAME_CONFIG.GRID_CELL_SIZE;
      const centerY = state.y * config.GAME_CONFIG.GRID_CELL_SIZE;
      const radiusPx = state.radius * config.GAME_CONFIG.GRID_CELL_SIZE + marginPx;
      const isVisible = isCircleBoundsIntersectingViewport(
        centerX,
        centerY,
        radiusPx,
        viewport,
      );

      const wasVisible = display.container.visible;
      display.container.visible = isVisible;

      if (isVisible && !wasVisible) {
        this.renderDisplayFromState(display, state);
      }
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

  /** 最新状態を描画オブジェクトへ反映する */
  private renderDisplayFromState(
    display: HurricaneDisplay,
    state: HurricaneStatePayload,
  ): void {
    if (Math.abs(display.radiusGrid - state.radius) > 0.0001) {
      this.applySpriteSize(display.sprite, state.radius);
      display.radiusGrid = state.radius;
    }

    display.container.x = state.x * config.GAME_CONFIG.GRID_CELL_SIZE;
    display.container.y = state.y * config.GAME_CONFIG.GRID_CELL_SIZE;
    display.container.rotation = state.rotationRad;
  }
}
