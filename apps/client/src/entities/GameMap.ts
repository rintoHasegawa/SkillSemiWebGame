import { Graphics } from "pixi.js";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

// マップ背景・グリッド・外枠の一括描画オブジェクト
export class GameMap extends Graphics {
  constructor() {
    super();
    this.drawMap();
  }

  // 設定値参照によるマップ外観組み立て処理
  private drawMap() {
    const { MAP_WIDTH, MAP_HEIGHT } = GAME_CONFIG;

    // マップ全域背景レイヤー
    this.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill(0x111111);
    
    // 100px 間隔縦方向グリッド線
    for (let x = 0; x <= MAP_WIDTH; x += 100) {
      this.moveTo(x, 0).lineTo(x, MAP_HEIGHT).stroke({ width: 1, color: 0x333333 });
    }
    // 100px 間隔横方向グリッド線
    for (let y = 0; y <= MAP_HEIGHT; y += 100) {
      this.moveTo(0, y).lineTo(MAP_WIDTH, y).stroke({ width: 1, color: 0x333333 });
    }
    
    // プレイ領域外枠
    this.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).stroke({ width: 5, color: 0xff4444 });
  }
}