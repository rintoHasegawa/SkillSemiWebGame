/**
 * GameMapModel
 * マップセルの色状態を管理する計算モデル
 * 全体更新と差分更新を適用して描画入力用の状態を保持する
 */
import { config } from "@client/config";
import type { domain } from "@repo/shared";

/** マップセル状態の計算責務を担うモデル */
export class GameMapModel {
  private readonly cellTeamIds: number[];
  private revision = 0;

  /** 設定値に基づいて初期セル状態を構築する */
  constructor() {
    const { GRID_COLS, GRID_ROWS } = config.GAME_CONFIG;
    this.cellTeamIds = new Array(GRID_COLS * GRID_ROWS).fill(-1);
  }

  /** 全体マップ状態を適用する */
  public applyMapState(state: domain.game.gridMap.MapState): void {
    let hasChanged = false;
    const maxLength = Math.min(
      this.cellTeamIds.length,
      state.gridColors.length,
    );
    for (let index = 0; index < maxLength; index++) {
      const nextTeamId = state.gridColors[index];
      if (this.cellTeamIds[index] === nextTeamId) {
        continue;
      }

      this.cellTeamIds[index] = nextTeamId;
      hasChanged = true;
    }

    if (hasChanged) {
      this.revision += 1;
    }
  }

  /** 差分セル更新を適用する */
  public applyUpdates(updates: domain.game.gridMap.CellUpdate[]): void {
    let hasChanged = false;
    updates.forEach(({ index, teamId }) => {
      if (!this.isValidIndex(index)) return;
      if (this.cellTeamIds[index] === teamId) {
        return;
      }

      this.cellTeamIds[index] = teamId;
      hasChanged = true;
    });

    if (hasChanged) {
      this.revision += 1;
    }
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

  /** 現在のマップ更新リビジョンを返す */
  public getRevision(): number {
    return this.revision;
  }

  /** チームごとの塗り率配列を取得する */
  public getPaintRatesByTeam(teamCount: number): number[] {
    if (teamCount <= 0) {
      return [];
    }

    const paintedCounts = new Array<number>(teamCount).fill(0);
    const totalCells = this.cellTeamIds.length;

    this.cellTeamIds.forEach((teamId) => {
      if (!Number.isInteger(teamId) || teamId < 0 || teamId >= teamCount) {
        return;
      }

      paintedCounts[teamId] += 1;
    });

    if (totalCells <= 0) {
      return paintedCounts.map(() => 0);
    }

    return paintedCounts.map((count) => (count / totalCells) * 100);
  }

  /** セル添字が有効範囲内かを判定する */
  private isValidIndex(index: number): boolean {
    return (
      Number.isInteger(index) && index >= 0 && index < this.cellTeamIds.length
    );
  }
}
