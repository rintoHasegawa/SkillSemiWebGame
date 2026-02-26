/**
 * BombRepository
 * 爆弾エンティティの保持と描画反映を管理する
 * 追加，更新，削除，破棄の基本操作を提供する
 */
import type { Container } from "pixi.js";
import { BombController } from "@client/scenes/game/entities/bomb/BombController";
import { BombIdRegistry } from "@client/scenes/game/entities/bomb/BombIdRegistry";

/** 爆弾の描画更新に使う入力データ型 */
export type BombRenderPayload = {
  x: number;
  y: number;
  explodeAtElapsedMs: number;
  radiusGrid: number;
  teamId: number;
  color: number;
};

/** BombRepository の初期化入力 */
export type BombRepositoryOptions = {
  worldContainer: Container;
  bombIdRegistry: BombIdRegistry;
};

/** 爆弾エンティティと描画情報の保持を管理する */
export class BombRepository {
  private readonly worldContainer: Container;
  private readonly bombIdRegistry: BombIdRegistry;
  private readonly bombs = new Map<string, BombController>();
  private readonly bombRenderPayloadById = new Map<string, BombRenderPayload>();

  constructor({ worldContainer, bombIdRegistry }: BombRepositoryOptions) {
    this.worldContainer = worldContainer;
    this.bombIdRegistry = bombIdRegistry;
  }

  /** 描画ペイロードで指定IDの爆弾を追加または更新する */
  public upsertBomb(bombId: string, payload: BombRenderPayload): void {
    const previousPayload = this.bombRenderPayloadById.get(bombId);
    if (previousPayload && this.isSameRenderPayload(previousPayload, payload)) {
      return;
    }

    const current = this.bombs.get(bombId);
    if (current) {
      this.worldContainer.removeChild(current.getDisplayObject());
      current.destroy();
    }

    const bomb = new BombController(payload);
    this.bombs.set(bombId, bomb);
    this.bombRenderPayloadById.set(bombId, payload);
    this.worldContainer.addChild(bomb.getDisplayObject());
  }

  /** 指定IDの爆弾を削除する */
  public removeBomb(bombId: string): void {
    const bomb = this.bombs.get(bombId);
    if (!bomb) {
      return;
    }

    this.worldContainer.removeChild(bomb.getDisplayObject());
    bomb.destroy();
    this.bombs.delete(bombId);
    this.bombRenderPayloadById.delete(bombId);
    this.bombIdRegistry.removeByBombId(bombId);
  }

  /** 指定IDの描画ペイロードを返す */
  public getRenderPayload(bombId: string): BombRenderPayload | undefined {
    return this.bombRenderPayloadById.get(bombId);
  }

  /** 管理中の爆弾を列挙する */
  public forEachBomb(callback: (bomb: BombController, bombId: string) => void): void {
    this.bombs.forEach((bomb, bombId) => {
      callback(bomb, bombId);
    });
  }

  /** 管理中の爆弾をすべて破棄する */
  public clear(): void {
    this.bombs.forEach((bomb) => bomb.destroy());
    this.bombs.clear();
    this.bombRenderPayloadById.clear();
  }

  private isSameRenderPayload(a: BombRenderPayload, b: BombRenderPayload): boolean {
    return a.x === b.x
      && a.y === b.y
      && a.explodeAtElapsedMs === b.explodeAtElapsedMs
      && a.radiusGrid === b.radiusGrid
      && a.teamId === b.teamId
      && a.color === b.color;
  }
}