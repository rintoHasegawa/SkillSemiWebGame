/**
 * GameMapModel
 * マップセルの色状態を管理する計算モデル
 * 全体更新と差分更新を適用して描画入力用の状態を保持する
 */
import { config } from '@client/config';
import type { domain } from '@repo/shared';

/** マップセル状態の計算責務を担うモデル */
export class GameMapModel {
  private readonly cellTeamIds: number[];

  /** 設定値に基づいて初期セル状態を構築する */
  constructor() {
    const { GRID_COLS, GRID_ROWS } = config.GAME_CONFIG;
    this.cellTeamIds = new Array(GRID_COLS * GRID_ROWS).fill(-1);
  }

  /** 全体マップ状態を適用する */
  public applyMapState(state: domain.gridMap.MapState): void {
    const maxLength = Math.min(this.cellTeamIds.length, state.gridColors.length);
    for (let index = 0; index < maxLength; index++) {
      this.cellTeamIds[index] = state.gridColors[index];
    }
  }

  /** 差分セル更新を適用する */
  public applyUpdates(updates: domain.gridMap.CellUpdate[]): void {
    updates.forEach(({ index, teamId }) => {
      if (!this.isValidIndex(index)) return;
      this.cellTeamIds[index] = teamId;
    });
  }

  /** 指定セルのチームIDを取得する */
  public getTeamId(index: number): number | undefined {
    if (!this.isValidIndex(index)) return undefined;
    return this.cellTeamIds[index];
  }

  /** 描画用の全セル状態を取得する */
  public getAllTeamIds(): number[] {
    return [...this.cellTeamIds];
  }

  /** セル添字が有効範囲内かを判定する */
  private isValidIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.cellTeamIds.length;
  }
}