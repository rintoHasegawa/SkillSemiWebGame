import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

export class Player extends Graphics {
  constructor(color: number = 0xFF0000) {
    super();
    // 半径10の赤い丸を描く（直接数値を指定）
    this.circle(0, 0, 10).fill(color);
  }

  // 移動メソッド
  move(vx: number, vy: number, deltaTime: number) {
    // 速度を定数から取得
    const speed = GAME_CONFIG.PLAYER_SPEED * deltaTime;
    this.x += vx * speed;
    this.y += vy * speed;

    // 画面外に出ないように制限
    this.x = Math.max(0, Math.min(window.innerWidth, this.x));
    this.y = Math.max(0, Math.min(window.innerHeight, this.y));
  }
}