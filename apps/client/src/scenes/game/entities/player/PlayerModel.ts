/**
 * PlayerModel
 * プレイヤーの座標計算と補間計算を担うモデル
 * ローカル移動，リモート目標座標，送信スナップショットを管理する
 */
import { config } from "@client/config";
import { domain } from "@repo/shared";

/** プレイヤーの座標計算と補間計算を管理するモデル */
export class PlayerModel {
  public readonly id: string;
  public readonly name: string;
  public readonly teamId: number;
  private readonly initialGridX: number;
  private readonly initialGridY: number;

  private gridX: number;
  private gridY: number;
  private targetGridX: number;
  private targetGridY: number;

  /** 共有プレイヤー情報から初期状態を構築する */
  constructor(data: domain.game.player.PlayerData) {
    this.id = data.id;
    this.name = data.name;
    this.teamId = data.teamId;
    this.initialGridX = data.x;
    this.initialGridY = data.y;
    this.gridX = data.x;
    this.gridY = data.y;
    this.targetGridX = data.x;
    this.targetGridY = data.y;
  }

  /** 現在座標を取得する */
  public getPosition(): domain.game.player.MovePayload {
    return { x: this.gridX, y: this.gridY };
  }

  /** 送信用スナップショットを取得する */
  public getSnapshot(): domain.game.player.PlayerData {
    return {
      id: this.id,
      name: this.name,
      teamId: this.teamId,
      x: this.gridX,
      y: this.gridY,
    };
  }

  /** ローカル入力に基づいて座標を更新する */
  public moveLocal(vx: number, vy: number, deltaTime: number): void {
    if (
      !this.isFiniteNumber(vx) ||
      !this.isFiniteNumber(vy) ||
      !this.isFiniteNumber(deltaTime)
    ) {
      return;
    }

    const { PLAYER_SPEED } = config.GAME_CONFIG;
    const speed = PLAYER_SPEED * deltaTime;

    this.gridX += vx * speed;
    this.gridY += vy * speed;

    this.clampToBounds();
  }

  /** リモート更新の目標座標を設定する */
  public setRemoteTarget(
    update: Partial<domain.game.player.MovePayload>,
  ): void {
    if (update.x !== undefined && this.isFiniteNumber(update.x))
      this.targetGridX = update.x;
    if (update.y !== undefined && this.isFiniteNumber(update.y))
      this.targetGridY = update.y;
  }

  /** 初期位置へ座標を戻す */
  public resetToInitialPosition(): void {
    this.gridX = this.initialGridX;
    this.gridY = this.initialGridY;
    this.targetGridX = this.initialGridX;
    this.targetGridY = this.initialGridY;
    this.clampToBounds();
  }

  /** 目標座標に向けて補間更新する */
  public updateRemoteLerp(deltaTime: number): void {
    if (!this.isFiniteNumber(deltaTime)) {
      return;
    }

    const { PLAYER_LERP_SNAP_THRESHOLD, PLAYER_LERP_SMOOTHNESS } =
      config.GAME_CONFIG;

    // 画面外間引き等で deltaTime が大きい場合に補間係数が 1 を超えて発散しないよう上限を設ける
    const lerpFactor = Math.min(PLAYER_LERP_SMOOTHNESS * deltaTime, 1);

    const diffX = this.targetGridX - this.gridX;
    const diffY = this.targetGridY - this.gridY;

    if (Math.abs(diffX) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.gridX = this.targetGridX;
    } else {
      this.gridX += diffX * lerpFactor;
    }

    if (Math.abs(diffY) < PLAYER_LERP_SNAP_THRESHOLD) {
      this.gridY = this.targetGridY;
    } else {
      this.gridY += diffY * lerpFactor;
    }
  }

  /** マップ境界内へ座標をクランプする（sharedの境界式を共用する） */
  private clampToBounds(): void {
    const { GRID_COLS, GRID_ROWS } = config.GAME_CONFIG;

    const clamped = domain.game.player.clampPositionToMapBounds(
      { x: this.gridX, y: this.gridY },
      { gridCols: GRID_COLS, gridRows: GRID_ROWS },
    );

    this.gridX = clamped.x;
    this.gridY = clamped.y;
  }

  /** 有限数かどうかを判定する */
  private isFiniteNumber(value: number): boolean {
    return Number.isFinite(value);
  }
}
