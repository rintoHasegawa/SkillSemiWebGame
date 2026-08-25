/**
 * BombModel
 * 爆弾の状態遷移と時間管理を担うモデル
 * 設置中 → 爆発中 → 終了 のライフサイクルを管理する
 */
import { config } from "@client/config";

/** 爆弾の状態を表す型 */
export type BombState = "armed" | "exploded" | "finished";

const EXPLOSION_VISIBLE_MS = 250;

type BombModelOptions = {
  x: number;
  y: number;
  radiusGrid: number;
  explodeAtElapsedMs: number;
  teamId: number;
  color: number;
};

/** 爆弾の状態と寿命を管理するモデル */
export class BombModel {
  private x: number;
  private y: number;
  private radiusGrid: number;
  private explodeAtElapsedMs: number;
  private teamId: number;
  private color: number;
  private state: BombState = "armed";

  constructor({ x, y, radiusGrid, explodeAtElapsedMs, teamId, color }: BombModelOptions) {
    this.x = x;
    this.y = y;
    this.radiusGrid = radiusGrid;
    this.explodeAtElapsedMs = explodeAtElapsedMs;
    this.teamId = teamId;
    this.color = color;
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

  public getTeamId(): number {
    return this.teamId;
  }

  public getColor(): number {
    return this.color;
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

  public getExplodeAtElapsedMs(): number {
    return this.explodeAtElapsedMs;
  }

  /** 導火線ゲージの残り比率（0〜1）を返す（armed 以外は 0 とする） */
  public getFuseRemainingRatio(elapsedMs: number): number {
    if (this.state !== "armed") return 0;

    const { BOMB_FUSE_MS } = config.GAME_CONFIG;
    const remainingRatio = (this.explodeAtElapsedMs - elapsedMs) / BOMB_FUSE_MS;

    return Math.min(1, Math.max(0, remainingRatio));
  }
}
