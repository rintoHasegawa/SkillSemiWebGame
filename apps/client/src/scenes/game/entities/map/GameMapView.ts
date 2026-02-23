/**
 * GameMapView
 * マップ背景，グリッド線，セル塗りの描画を担うビュー
 * 計算済みセル状態を受けてPixi描画へ反映する
 */
import { Container, Graphics } from 'pixi.js';
import { config } from '@repo/shared';

/** マップ描画責務を担うビュー */
export class GameMapView {
  public readonly displayObject: Container;

  private readonly bgGraphics: Graphics;
  private readonly gridGraphics: Graphics;
  private readonly cells: Graphics[] = [];

  /** 背景，グリッド線，セル描画オブジェクトを初期化する */
  constructor() {
    this.displayObject = new Container();
    this.bgGraphics = new Graphics();
    this.gridGraphics = new Graphics();

    this.displayObject.addChild(this.bgGraphics);
    this.initCells();
    this.displayObject.addChild(this.gridGraphics);
    this.drawBaseMap();
  }

  /** 全セル状態をまとめて描画へ反映する */
  public renderAll(teamIds: number[]): void {
    const maxLength = Math.min(this.cells.length, teamIds.length);
    for (let index = 0; index < maxLength; index++) {
      this.renderCell(index, teamIds[index]);
    }
  }

  /** 指定セルの状態を描画へ反映する */
  public renderCell(index: number, teamId: number): void {
    const cell = this.cells[index];
    if (!cell) return;

    const { GRID_CELL_SIZE } = config.GAME_CONFIG;

    // 対象セルをクリアしてから必要に応じて再塗布する
    cell.clear();
    if (teamId === -1) return;

    const hexColor = this.toHexColor(teamId);
    cell.rect(0, 0, GRID_CELL_SIZE, GRID_CELL_SIZE).fill(hexColor);
  }

  /** 描画リソースを破棄する */
  public destroy(): void {
    this.displayObject.destroy({ children: true });
  }

  /** 設定値に基づいてセル描画オブジェクトを初期化する */
  private initCells(): void {
    const { GRID_COLS, GRID_ROWS, GRID_CELL_SIZE } = config.GAME_CONFIG;
    const totalCells = GRID_COLS * GRID_ROWS;

    for (let index = 0; index < totalCells; index++) {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);

      const cell = new Graphics();
      cell.x = col * GRID_CELL_SIZE;
      cell.y = row * GRID_CELL_SIZE;

      this.displayObject.addChild(cell);
      this.cells.push(cell);
    }
  }

  /** マップ背景とグリッド線を描画する */
  private drawBaseMap(): void {
    const {
      MAP_WIDTH_PX,
      MAP_HEIGHT_PX,
      GRID_CELL_SIZE,
      MAP_BG_COLOR,
      MAP_GRID_COLOR,
      MAP_BORDER_COLOR,
    } = config.GAME_CONFIG;

    this.bgGraphics.rect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX).fill(MAP_BG_COLOR);

    for (let x = 0; x <= MAP_WIDTH_PX; x += GRID_CELL_SIZE) {
      this.gridGraphics.moveTo(x, 0).lineTo(x, MAP_HEIGHT_PX).stroke({ width: 1, color: MAP_GRID_COLOR });
    }

    for (let y = 0; y <= MAP_HEIGHT_PX; y += GRID_CELL_SIZE) {
      this.gridGraphics.moveTo(0, y).lineTo(MAP_WIDTH_PX, y).stroke({ width: 1, color: MAP_GRID_COLOR });
    }

    this.gridGraphics.rect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX).stroke({ width: 5, color: MAP_BORDER_COLOR });
  }

  /** チームIDから塗り色の16進数カラー値を取得する */
  private toHexColor(teamId: number): number {
    const { TEAM_COLORS } = config.GAME_CONFIG;
    const colorString = TEAM_COLORS[teamId] || '#FFFFFF';
    return parseInt(colorString.replace('#', '0x'), 16);
  }
}