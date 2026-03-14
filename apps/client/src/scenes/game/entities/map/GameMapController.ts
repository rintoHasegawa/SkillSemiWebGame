/**
 * GameMapController
 * 外部からのマップ更新入力をModelとViewへ仲介するコントローラー
 * 全体更新と差分更新を統一的に扱い，描画同期を提供する
 */
import type { domain } from "@repo/shared";
import type { Container } from "pixi.js";
import { config } from "@client/config";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { GameMapModel } from "./GameMapModel";
import { GameMapView } from "./GameMapView";

/** マップ更新の仲介責務を担うコントローラー */
export class GameMapController {
  private readonly appearanceResolver: AppearanceResolver;
  private readonly model: GameMapModel;
  private readonly view: GameMapView;

  /** モデルとビューを生成し初期同期する */
  constructor(appearanceResolver: AppearanceResolver) {
    this.appearanceResolver = appearanceResolver;
    this.model = new GameMapModel();
    this.view = new GameMapView();
    this.view.renderAll(this.resolveAllCellColors(this.model.getAllTeamIds()));
  }

  /** 描画オブジェクトを取得する */
  public getDisplayObject(): Container {
    return this.view.displayObject;
  }

  /** 全体マップ状態を反映する */
  public updateMapState(state: domain.game.gridMap.MapState): void {
    this.model.applyMapState(state);
    this.view.renderAll(this.resolveAllCellColors(this.model.getAllTeamIds()));
  }

  /** 差分セル更新を反映する */
  public updateCells(updates: domain.game.gridMap.CellUpdate[]): void {
    this.model.applyUpdates(updates);

    updates.forEach(({ index }) => {
      const teamId = this.model.getTeamId(index);
      if (teamId === undefined) return;
      this.view.renderCell(index, this.resolveCellColor(teamId));
    });
  }

  /** 管理中の描画リソースを破棄する */
  public destroy(): void {
    this.view.destroy();
  }

  /** チームごとの塗り率配列を取得する */
  public getPaintRatesByTeam(): number[] {
    return this.model.getPaintRatesByTeam(config.GAME_CONFIG.TEAM_COUNT);
  }

  /** 現在の全セルteamId配列を取得する */
  public getAllCellTeamIds(): number[] {
    return this.model.getAllTeamIds();
  }

  /** すべてのセルteamIdを描画色へ変換する */
  private resolveAllCellColors(teamIds: number[]): Array<number | null> {
    return teamIds.map((teamId) => this.resolveCellColor(teamId));
  }

  /** セルteamIdを描画色へ変換する */
  private resolveCellColor(teamId: number): number | null {
    return this.appearanceResolver.resolveMapCellColor(teamId);
  }
}
