import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from '@repo/shared';

export class Player extends Graphics {
  constructor(color: number = 0xFF0000) {
    super();
    // プレイヤーを描画
    this.circle(0, 0, GAME_CONFIG.PLAYER_RADIUS).fill(color);
  }

  // 移動メソッド
  move(vx: number, vy: number, deltaTime: number) {
    // 速度 * 時間 = 移動距離
    const speed = GAME_CONFIG.PLAYER_SPEED * deltaTime;
    this.x += vx * speed;
    this.y += vy * speed;

    // 画面外に出ないように制限（簡易版）
    this.x = Math.max(0, Math.min(window.innerWidth, this.x));
    this.y = Math.max(0, Math.min(window.innerHeight, this.y));
  }
}