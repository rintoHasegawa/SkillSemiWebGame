import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

export class Player extends Graphics {
  constructor(color: number | string = 0xFF0000, isMe: boolean = false) {
    super();

    const { PLAYER_RADIUS } = GAME_CONFIG;
    
    // 文字列（"#FF0000"等）で来た場合にも対応
    const hexColor = typeof color === "string" 
      ? parseInt(color.replace("#", "0x"), 16) 
      : color;

    // 本体の描画
    this.circle(0, 0, PLAYER_RADIUS).fill(hexColor);

    // 自分自身の場合は目印の枠線を追加
    if (isMe) {
      this.circle(0, 0, PLAYER_RADIUS).stroke({ width: 3, color: 0xffff00 });
    }
  }

  // 移動メソッド（壁ドン判定はMAPのサイズを使用）
  move(vx: number, vy: number, deltaTime: number) {
    const { PLAYER_SPEED, MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS } = GAME_CONFIG;

    const speed = PLAYER_SPEED * deltaTime;
    this.x += vx * speed;
    this.y += vy * speed;

    // はみ出し防止（半径分を考慮）
    this.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, this.x));
    this.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, this.y));
  }
}