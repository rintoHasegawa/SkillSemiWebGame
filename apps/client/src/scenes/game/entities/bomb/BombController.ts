/**
 * BombController
 * 爆弾のModelとViewの橋渡しを担うコントローラー
 * 時間更新ごとの状態遷移と描画同期を統合する
 */
import { BombModel } from "./BombModel";
import { BombView } from "./BombView";

type BombControllerOptions = {
  x: number;
  y: number;
  radiusGrid: number;
  explodeAtElapsedMs: number;
  teamId: number;
};

/** 爆弾1つ分の状態と描画同期を管理するコントローラー */
export class BombController {
  private readonly model: BombModel;
  private readonly view: BombView;

  constructor({ x, y, radiusGrid, explodeAtElapsedMs, teamId }: BombControllerOptions) {
    this.model = new BombModel({ x, y, radiusGrid, explodeAtElapsedMs, teamId });
    this.view = new BombView();

    const pos = this.model.getPosition();
    this.view.syncPosition(pos.x, pos.y);
    this.view.renderState(this.model.getState(), this.model.getExplosionRadiusGrid(), this.model.getTeamId());
  }

  public getDisplayObject() {
    return this.view.displayObject;
  }

  public tick(elapsedMs: number): void {
    this.model.update(elapsedMs);
    this.view.renderState(this.model.getState(), this.model.getExplosionRadiusGrid(), this.model.getTeamId());
  }

  public isFinished(): boolean {
    return this.model.isFinished();
  }

  public destroy(): void {
    this.view.destroy();
  }
}
