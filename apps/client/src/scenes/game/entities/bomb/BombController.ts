/**
 * BombController
 * 爆弾のModelとViewの橋渡しを担うコントローラー
 * 時間更新ごとの状態遷移と描画同期を統合する
 */
import { BombModel } from "./BombModel";
import { BombView } from "./BombView";
import type { BombState } from "./BombModel";

type BombControllerOptions = {
  x: number;
  y: number;
  radiusGrid: number;
  explodeAtElapsedMs: number;
  teamId: number;
  color: number;
};

/** 爆弾1つ分の状態と描画同期を管理するコントローラー */
export class BombController {
  private readonly model: BombModel;
  private readonly view: BombView;

  constructor({ x, y, radiusGrid, explodeAtElapsedMs, teamId, color }: BombControllerOptions) {
    this.model = new BombModel({ x, y, radiusGrid, explodeAtElapsedMs, teamId, color });
    this.view = new BombView();

    const pos = this.model.getPosition();
    this.view.syncPosition(pos.x, pos.y);
    this.view.renderState(this.model.getState(), this.model.getExplosionRadiusGrid(), this.model.getColor());
  }

  public getDisplayObject() {
    return this.view.displayObject;
  }

  /** 経過時間に基づいて内部状態だけ更新する */
  public updateState(elapsedMs: number): void {
    this.model.update(elapsedMs);
  }

  /** 現在状態を描画へ同期する */
  public render(): void {
    this.view.renderState(this.model.getState(), this.model.getExplosionRadiusGrid(), this.model.getColor());
  }

  public getState(): BombState {
    return this.model.getState();
  }

  public getPosition(): { x: number; y: number } {
    return this.model.getPosition();
  }

  public getExplosionRadiusGrid(): number {
    return this.model.getExplosionRadiusGrid();
  }

  public getTeamId(): number {
    return this.model.getTeamId();
  }

  public isFinished(): boolean {
    return this.model.isFinished();
  }

  public destroy(): void {
    this.view.destroy();
  }
}
