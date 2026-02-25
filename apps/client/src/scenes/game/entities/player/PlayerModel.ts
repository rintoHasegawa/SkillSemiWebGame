/**
 * PlayerModel
 * プレイヤーの座標計算と補間計算を担うモデル
 * ローカル移動，リモート目標座標，送信スナップショットを管理する
 */
import { config } from '@client/config';
import type { playerTypes } from '@repo/shared';

/** プレイヤーの座標計算と補間計算を管理するモデル */
export class PlayerModel {
  public readonly id: string;
  public readonly teamId: number;

  private gridX: number;
  private gridY: number;
  private targetGridX: number;
  private targetGridY: number;

  /** 共有プレイヤー情報から初期状態を構築する */
  constructor(data: playerTypes.PlayerData) {
    this.id = data.id;
    this.teamId = data.teamId;
    this.gridX = data.x;
    this.gridY = data.y;
    this.targetGridX = data.x;
    this.targetGridY = data.y;
  }

  /** 現在座標を取得する */
  public getPosition(): playerTypes.MovePayload {
    return { x: this.gridX, y: this.gridY };
  }

  /** 送信用スナップショットを取得する */
  public getSnapshot(): playerTypes.PlayerData {
    return {
      id: this.id,
      teamId: this.teamId,
      x: this.gridX,
      y: this.gridY,
    };
  }

  /** ローカル入力に基づいて座標を更新する */
  public moveLocal(vx: number, vy: number, deltaTime: number): void {
    if (!this.isFiniteNumber(vx) || !this.isFiniteNumber(vy) || !this.isFiniteNumber(deltaTime)) {
      return;
    }

    const { PLAYER_SPEED } = config.GAME_CONFIG;
    const speed = PLAYER_SPEED * deltaTime;

    this.gridX += vx * speed;
    this.gridY += vy * speed;

    this.clampToBounds();
  }

  /** リモート更新の目標座標を設定する */
  public setRemoteTarget(update: Partial<playerTypes.MovePayload>): void {
    if (update.x !== undefined && this.isFiniteNumber(update.x)) this.targetGridX = update.x;
    if (update.y !== undefined && this.isFiniteNumber(update.y)) this.targetGridY = update.y;
  }

  /** 目標座標に向けて補間更新する */
  public updateRemoteLerp(deltaTime: number): void {
    if (!this.isFiniteNumber(deltaTime)) {
      return;
    }

    const { PLAYER_LERP_SNAP_THRESHOLD, PLAYER_LERP_SMOOTHNESS } = config.GAME_CONFIG;

    const diffX = this.targetGridX - this.gridX;
    const diffY = this.targetGridY - this.gridY;

    if (Math.abs(diffX) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.gridX = this.targetGridX;
    } else {
      this.gridX += diffX * PLAYER_LERP_SMOOTHNESS * deltaTime;
    }

    if (Math.abs(diffY) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.gridY = this.targetGridY;
    } else {
      this.gridY += diffY * PLAYER_LERP_SMOOTHNESS * deltaTime;
    }
  }

  /** マップ境界内へ座標をクランプする */
  private clampToBounds(): void {
    const { GRID_COLS, GRID_ROWS, PLAYER_RADIUS } = config.GAME_CONFIG;

    this.gridX = Math.max(PLAYER_RADIUS, Math.min(GRID_COLS - PLAYER_RADIUS, this.gridX));
    this.gridY = Math.max(PLAYER_RADIUS, Math.min(GRID_ROWS - PLAYER_RADIUS, this.gridY));
  }

  /** 有限数かどうかを判定する */
  private isFiniteNumber(value: number): boolean {
    return Number.isFinite(value);
  }
}