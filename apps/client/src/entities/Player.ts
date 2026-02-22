import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";
import type { PlayerData } from "@repo/shared/src/domains/player/player.type";

/**
 * プレイヤーの共通基底クラス（描画と基本データの保持）
 */
export abstract class BasePlayer extends Graphics {
  public id: string;
  public teamId: number;

  constructor(data: PlayerData) {
    super();
    this.id = data.id;
    this.teamId = data.teamId;
    
    // 初期座標のセット
    this.position.set(data.x, data.y);

    // gameConfigから定数を取得
    const { PLAYER_RADIUS, TEAM_COLORS } = GAME_CONFIG;

    // チームIDに対応する色をHEX文字列('#RRGGBB')で取得し、PixiJS用の数値(0xRRGGBB)に変換
    const colorString = TEAM_COLORS[this.teamId] || '#FFFFFF';
    const hexColor = parseInt(colorString.replace("#", "0x"), 16);

    // 共通の描画（円）
    this.circle(0, 0, PLAYER_RADIUS).fill(hexColor);
  }

  // 毎フレーム呼ばれる更新メソッド（サブクラスで具体的な処理を実装させる）
  abstract update(deltaTime: number): void;
}

/**
 * 自プレイヤー（キー・ジョイスティック入力で移動・送信する）
 */
export class LocalPlayer extends BasePlayer {
  constructor(data: PlayerData) {
    super(data);
    
    // 自プレイヤーであることを示す黄色のハイライト（外枠）
    const { PLAYER_RADIUS } = GAME_CONFIG;
    this.circle(0, 0, PLAYER_RADIUS).stroke({ width: 3, color: 0xffff00 });
  }

  /**
   * 入力ベクトルと経過時間基準の座標更新処理
   */
  public move(vx: number, vy: number, deltaTime: number) {
    const { PLAYER_SPEED, MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS } = GAME_CONFIG;

    const speed = PLAYER_SPEED * deltaTime;
    this.x += vx * speed;
    this.y += vy * speed;

    // 画面外に出ないようにクランプ
    this.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, this.x));
    this.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, this.y));
  }

  public update(_deltaTime: number): void {
    // 自プレイヤーは GameScene 側から move() を通じて動かすため、ここでは何もしない
  }
}

/**
 * 他プレイヤー（サーバーからの通信を受信して補間・吸着移動する）
 */
export class RemotePlayer extends BasePlayer {
  private targetX: number;
  private targetY: number;

  constructor(data: PlayerData) {
    super(data);
    this.targetX = data.x;
    this.targetY = data.y;
  }

  /**
   * サーバーから受信した最新の座標を目標としてセットする
   */
  public setTargetPosition(x?: number, y?: number) {
    if (x !== undefined) this.targetX = x;
    if (y !== undefined) this.targetY = y;
  }

  /**
   * 毎フレームの更新処理（目標座標へのLerp補間）
   */
  public update(deltaTime: number): void {
    const { PLAYER_LERP_SNAP_THRESHOLD, PLAYER_LERP_SMOOTHNESS } = GAME_CONFIG;

    const diffX = this.targetX - this.x;
    const diffY = this.targetY - this.y;

    // X軸の補間
    if (Math.abs(diffX) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.x = this.targetX;
    } else {
      this.x += diffX * PLAYER_LERP_SMOOTHNESS * deltaTime;
    }

    // Y軸の補間
    if (Math.abs(diffY) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.y = this.targetY;
    } else {
      this.y += diffY * PLAYER_LERP_SMOOTHNESS * deltaTime;
    }
  }
}