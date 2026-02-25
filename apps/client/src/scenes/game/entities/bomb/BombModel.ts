/**
 * BombModel
 * 爆弾の状態遷移と時間管理を担うモデル
 * 設置中 → 爆発中 → 終了 のライフサイクルを管理する
 */
export type BombState = "armed" | "exploded" | "finished";

const EXPLOSION_VISIBLE_MS = 250;

type BombModelOptions = {
  x: number;
  y: number;
  radiusGrid: number;
  placedAtElapsedMs: number;
  explodeAtElapsedMs: number;
};

/** 爆弾の状態と寿命を管理するモデル */
export class BombModel {
  private x: number;
  private y: number;
  private radiusGrid: number;
  private placedAtElapsedMs: number;
  private explodeAtElapsedMs: number;
  private state: BombState = "armed";

  constructor({ x, y, radiusGrid, placedAtElapsedMs, explodeAtElapsedMs }: BombModelOptions) {
    this.x = x;
    this.y = y;
    this.radiusGrid = radiusGrid;
    this.placedAtElapsedMs = placedAtElapsedMs;
    this.explodeAtElapsedMs = explodeAtElapsedMs;
  }

  public getPosition() {
    return { x: this.x, y: this.y };
  }

  public getState(): BombState {
    return this.state;
  }

  public getExplosionRadiusGrid(): number {
    return this.radiusGrid;
  }

  public update(elapsedMs: number): void {
    if (this.state === "finished") return;

    if (this.state === "armed" && elapsedMs >= this.explodeAtElapsedMs) {
      this.state = "exploded";
      return;
    }

    if (this.state === "exploded" && elapsedMs >= this.explodeAtElapsedMs + EXPLOSION_VISIBLE_MS) {
      this.state = "finished";
    }
  }

  public isFinished(): boolean {
    return this.state === "finished";
  }

  public getPlacedAtElapsedMs(): number {
    return this.placedAtElapsedMs;
  }

  public getExplodeAtElapsedMs(): number {
    return this.explodeAtElapsedMs;
  }
}
