// apps/client/src/game/map/GameMap.ts (パスは適宜読み替えてください)
import { Container, Graphics } from "pixi.js";
import { config } from "@repo/shared";
import type { gridMapTypes } from "@repo/shared";

// 親クラスを Graphics から Container に変更し、レイヤー管理を可能にする
export class GameMap extends Container {
  private bgGraphics: Graphics;
  private gridGraphics: Graphics;
  
  // 400個（GRID_COLS * GRID_ROWS）のマス目描画用オブジェクトを保持する1次元配列
  private cells: Graphics[] = [];

  constructor() {
    super();
    this.bgGraphics = new Graphics();
    this.gridGraphics = new Graphics();

    // 描画順（追加した順に前面に描画される）: 背景 -> マス目 -> グリッド線
    this.addChild(this.bgGraphics);
    
    // マス目の初期化と Container への追加
    this.initCells();
    
    this.addChild(this.gridGraphics);

    // 背景と線の描画（静的なので1回だけ実行）
    this.drawBaseMap();
  }

  // 設定値に基づき、空のマス目（Graphics）を400個生成して配列に格納する
  private initCells() {
    const { GRID_COLS, GRID_ROWS, GRID_CELL_SIZE } = config.GAME_CONFIG;
    const totalCells = GRID_COLS * GRID_ROWS;

    for (let i = 0; i < totalCells; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);

      const cell = new Graphics();
      // マスの座標をあらかじめ設定しておく（描画の基準点になる）
      cell.x = col * GRID_CELL_SIZE;
      cell.y = row * GRID_CELL_SIZE;
      
      this.addChild(cell);
      this.cells.push(cell);
    }
  }

  // 設定値参照によるマップ外観（背景・グリッド線）の組み立て処理
  private drawBaseMap() {
    const { 
      MAP_WIDTH_PX, MAP_HEIGHT_PX, GRID_CELL_SIZE, 
      MAP_BG_COLOR, MAP_GRID_COLOR, MAP_BORDER_COLOR 
    } = config.GAME_CONFIG;

    // マップ全域背景レイヤー
    this.bgGraphics.rect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX).fill(MAP_BG_COLOR);
    
    // 縦方向グリッド線
    for (let x = 0; x <= MAP_WIDTH_PX; x += GRID_CELL_SIZE) {
      this.gridGraphics.moveTo(x, 0).lineTo(x, MAP_HEIGHT_PX).stroke({ width: 1, color: MAP_GRID_COLOR });
    }
    // 横方向グリッド線
    for (let y = 0; y <= MAP_HEIGHT_PX; y += GRID_CELL_SIZE) {
      this.gridGraphics.moveTo(0, y).lineTo(MAP_WIDTH_PX, y).stroke({ width: 1, color: MAP_GRID_COLOR });
    }
    
    // プレイ領域外枠
    this.gridGraphics.rect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX).stroke({ width: 5, color: MAP_BORDER_COLOR });
  }

  /**
   * サーバー（またはテストロジック）から受け取った最新のマップ状態で色を更新する
   */
  public updateMapState(state: gridMapTypes.MapState) {
    const { GRID_CELL_SIZE, TEAM_COLORS } = config.GAME_CONFIG;

    for (let i = 0; i < state.gridColors.length; i++) {
      const teamId = state.gridColors[i];
      const cell = this.cells[i];

      // 一旦マスの描画をクリア
      cell.clear();

      // 塗布済み（-1以外）の場合のみ色を塗る
      if (teamId !== -1) {
        // Player.ts と同様に、文字列のカラーコードを PixiJS 用の数値に変換
        const colorString = TEAM_COLORS[teamId] || '#FFFFFF';
        const hexColor = parseInt(colorString.replace("#", "0x"), 16);

        // cell.x, cell.y は設定済みなので、ローカル座標 (0,0) からサイズ分を塗りつぶす
        cell.rect(0, 0, GRID_CELL_SIZE, GRID_CELL_SIZE).fill(hexColor);
      }
    }
  }

  /**
   * 差分データを受け取って指定のマスだけ色を更新する
   */
  public updateCells(updates: gridMapTypes.CellUpdate[]) {
    const { GRID_CELL_SIZE, TEAM_COLORS } = config.GAME_CONFIG;

    updates.forEach(({ index, teamId }) => {
      const cell = this.cells[index];
      if (!cell) return;

      cell.clear();

      if (teamId !== -1) {
        const colorString = TEAM_COLORS[teamId] || '#FFFFFF';
        const hexColor = parseInt(colorString.replace("#", "0x"), 16);
        cell.rect(0, 0, GRID_CELL_SIZE, GRID_CELL_SIZE).fill(hexColor);
      }
    });
  }
}