/**
 * GameMapController
 * 外部からのマップ更新入力をModelとViewへ仲介するコントローラー
 * 全体更新と差分更新を統一的に扱い，描画同期を提供する
 */
import type { gridMapTypes } from '@repo/shared';
import type { Container } from 'pixi.js';
import { GameMapModel } from './GameMapModel';
import { GameMapView } from './GameMapView';

/** マップ更新の仲介責務を担うコントローラー */
export class GameMapController {
  private readonly model: GameMapModel;
  private readonly view: GameMapView;

  /** モデルとビューを生成し初期同期する */
  constructor() {
    this.model = new GameMapModel();
    this.view = new GameMapView();
    this.view.renderAll(this.model.getAllTeamIds());
  }

  /** 描画オブジェクトを取得する */
  public getDisplayObject(): Container {
    return this.view.displayObject;
  }

  /** 全体マップ状態を反映する */
  public updateMapState(state: gridMapTypes.MapState): void {
    this.model.applyMapState(state);
    this.view.renderAll(this.model.getAllTeamIds());
  }

  /** 差分セル更新を反映する */
  public updateCells(updates: gridMapTypes.CellUpdate[]): void {
    this.model.applyUpdates(updates);

    updates.forEach(({ index }) => {
      const teamId = this.model.getTeamId(index);
      if (teamId === undefined) return;
      this.view.renderCell(index, teamId);
    });
  }

  /** 管理中の描画リソースを破棄する */
  public destroy(): void {
    this.view.destroy();
  }
}