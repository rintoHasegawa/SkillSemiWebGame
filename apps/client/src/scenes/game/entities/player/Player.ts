import { Graphics } from 'pixi.js';
import { config } from "@repo/shared";
import type { playerTypes } from "@repo/shared";

/**
 * プレイヤーの共通基底クラス（描画と基本データの保持）
 */
export abstract class BasePlayer extends Graphics {
  public id: string;
  public teamId: number;
  public gridX: number;
  public gridY: number;

  constructor(data: playerTypes.PlayerData, isLocal: boolean = false) {
    super();
    this.id = data.id;
    this.teamId = data.teamId;
    
    // 初期座標のセット（内部はグリッド単位）
    this.gridX = data.x;
    this.gridY = data.y;

    // gameConfigから定数を取得
    const { 
      GRID_CELL_SIZE,
      PLAYER_RADIUS_PX, 
      TEAM_COLORS,
      PLAYER_LOCAL_STROKE_COLOR,
      PLAYER_LOCAL_STROKE_WIDTH,
      PLAYER_REMOTE_STROKE_COLOR,
      PLAYER_REMOTE_STROKE_WIDTH
    } = config.GAME_CONFIG;

    this.position.set(this.gridX * GRID_CELL_SIZE, this.gridY * GRID_CELL_SIZE);

    // チームIDに対応する色をHEX文字列('#RRGGBB')で取得し、PixiJS用の数値(0xRRGGBB)に変換
    const colorString = TEAM_COLORS[this.teamId] || '#FFFFFF';
    const hexColor = parseInt(colorString.replace("#", "0x"), 16);

    // 自プレイヤーか他プレイヤーかで枠線の設定を切り替え
    const strokeColor = isLocal ? PLAYER_LOCAL_STROKE_COLOR : PLAYER_REMOTE_STROKE_COLOR;
    const strokeWidth = isLocal ? PLAYER_LOCAL_STROKE_WIDTH : PLAYER_REMOTE_STROKE_WIDTH;

    // 塗りつぶしと枠線を同時に描画
    this.circle(0, 0, PLAYER_RADIUS_PX)
        .fill(hexColor)
        .stroke({ width: strokeWidth, color: strokeColor });
  }

  protected syncDisplayPosition() {
    const { GRID_CELL_SIZE } = config.GAME_CONFIG;
    this.position.set(this.gridX * GRID_CELL_SIZE, this.gridY * GRID_CELL_SIZE);
  }

  // 毎フレーム呼ばれる更新メソッド（サブクラスで具体的な処理を実装させる）
  abstract update(deltaTime: number): void;
}

/**
 * 自プレイヤー（キー・ジョイスティック入力で移動・送信する）
 */
export class LocalPlayer extends BasePlayer {
  constructor(data: playerTypes.PlayerData) {
    super(data, true);
  }

  /**
   * 入力ベクトルと経過時間基準の座標更新処理
   */
  public move(vx: number, vy: number, deltaTime: number) {
    const { PLAYER_SPEED, GRID_COLS, GRID_ROWS, PLAYER_RADIUS } = config.GAME_CONFIG;

    const speed = PLAYER_SPEED * deltaTime;
    this.gridX += vx * speed;
    this.gridY += vy * speed;

    // 画面外に出ないようにクランプ
    this.gridX = Math.max(PLAYER_RADIUS, Math.min(GRID_COLS - PLAYER_RADIUS, this.gridX));
    this.gridY = Math.max(PLAYER_RADIUS, Math.min(GRID_ROWS - PLAYER_RADIUS, this.gridY));

    this.syncDisplayPosition();
  }

  public update(_deltaTime: number): void {
    // 自プレイヤーは GameScene 側から move() を通じて動かすため、ここでは何もしない
  }
}

/**
 * 他プレイヤー（サーバーからの通信を受信して補間・吸着移動する）
 */
export class RemotePlayer extends BasePlayer {
  private targetGridX: number;
  private targetGridY: number;

  constructor(data: playerTypes.PlayerData) {
    super(data, false);
    this.targetGridX = data.x;
    this.targetGridY = data.y;
  }

  /**
   * サーバーから受信した最新の座標を目標としてセットする
   */
  public setTargetPosition(x?: number, y?: number) {
    if (x !== undefined) this.targetGridX = x;
    if (y !== undefined) this.targetGridY = y;
  }

  /**
   * 毎フレームの更新処理（目標座標へのLerp補間）
   */
  public update(deltaTime: number): void {
    const { PLAYER_LERP_SNAP_THRESHOLD, PLAYER_LERP_SMOOTHNESS } = config.GAME_CONFIG;

    const diffX = this.targetGridX - this.gridX;
    const diffY = this.targetGridY - this.gridY;

    // X軸の補間
    if (Math.abs(diffX) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.gridX = this.targetGridX;
    } else {
      this.gridX += diffX * PLAYER_LERP_SMOOTHNESS * deltaTime;
    }

    // Y軸の補間
    if (Math.abs(diffY) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.gridY = this.targetGridY;
    } else {
      this.gridY += diffY * PLAYER_LERP_SMOOTHNESS * deltaTime;
    }

    this.syncDisplayPosition();
  }
}