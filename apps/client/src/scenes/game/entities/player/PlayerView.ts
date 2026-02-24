/**
 * PlayerView
 * プレイヤーの描画責務を担うビュー
 * Pixi Graphicsの生成と座標反映を行う
 */
import { Graphics } from 'pixi.js';
import { config } from '@repo/shared';

/**
 * プレイヤーの描画責務を担うビュー
 */
export class PlayerView {
  public readonly displayObject: Graphics;

  /** チーム情報と種別に応じた描画オブジェクトを生成する */
  constructor(teamId: number, isLocal: boolean) {
    const {
      PLAYER_RADIUS_PX,
      TEAM_COLORS,
      PLAYER_LOCAL_STROKE_COLOR,
      PLAYER_LOCAL_STROKE_WIDTH,
      PLAYER_REMOTE_STROKE_COLOR,
      PLAYER_REMOTE_STROKE_WIDTH,
    } = config.GAME_CONFIG;

    const colorString = TEAM_COLORS[teamId] || '#FFFFFF';
    const fillColor = parseInt(colorString.replace('#', '0x'), 16);
    const strokeColor = isLocal ? PLAYER_LOCAL_STROKE_COLOR : PLAYER_REMOTE_STROKE_COLOR;
    const strokeWidth = isLocal ? PLAYER_LOCAL_STROKE_WIDTH : PLAYER_REMOTE_STROKE_WIDTH;

    this.displayObject = new Graphics();
    this.displayObject
      .circle(0, 0, PLAYER_RADIUS_PX)
      .fill(fillColor)
      .stroke({ width: strokeWidth, color: strokeColor });
  }

  /** グリッド座標を描画座標へ反映する */
  public syncPosition(gridX: number, gridY: number): void {
    const { GRID_CELL_SIZE } = config.GAME_CONFIG;
    this.displayObject.position.set(gridX * GRID_CELL_SIZE, gridY * GRID_CELL_SIZE);
  }

  /** 描画オブジェクトを破棄する */
  public destroy(): void {
    this.displayObject.destroy();
  }
}