import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

// プレイヤー見た目描画と移動処理の統合オブジェクト
export class Player extends Graphics {
  constructor(color: number | string = 0xFF0000, isMe: boolean = false) {
    super();

    const { PLAYER_RADIUS } = GAME_CONFIG;
    
    // 文字列色指定の Pixi 数値色形式変換
    const hexColor = typeof color === "string" 
      ? parseInt(color.replace("#", "0x"), 16) 
      : color;

    // プレイヤー本体円描画
    this.circle(0, 0, PLAYER_RADIUS).fill(hexColor);

    // 自身プレイヤー識別用外周ライン
    if (isMe) {
      this.circle(0, 0, PLAYER_RADIUS).stroke({ width: 3, color: 0xffff00 });
    }
  }

  // 入力ベクトルと経過時間基準の座標更新処理
  move(vx: number, vy: number, deltaTime: number) {
    const { PLAYER_SPEED, MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS } = GAME_CONFIG;

    const speed = PLAYER_SPEED * deltaTime;
    this.x += vx * speed;
    this.y += vy * speed;

    // 半径考慮の境界内クランプ処理
    this.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, this.x));
    this.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, this.y));
  }
}