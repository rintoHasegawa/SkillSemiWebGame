/**
 * HurricaneSystem
 * ハリケーンの生成，移動，同期データ化，被弾検知を管理する
 * GameLoop からハリケーン専用責務を分離する
 */
import { config } from "@server/config";
import { domain, type HurricaneStatePayload } from "@repo/shared";
import { Player } from "../entities/player/Player.js";

const { checkBombHit } = domain.game.bombHit;

type HurricaneState = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotationRad: number;
};

type HurricaneSyncSnapshot = {
  x: number;
  y: number;
  radius: number;
  rotationRad: number;
};

const HURRICANE_POSITION_SYNC_SCALE = 10;
const HURRICANE_ROTATION_SYNC_SCALE = 4;

const quantizeValue = (value: number, scale: number): number => {
  return Math.round(value * scale) / scale;
};

const toHurricaneSyncSnapshot = (
  state: HurricaneState,
): HurricaneSyncSnapshot => {
  return {
    x: quantizeValue(state.x, HURRICANE_POSITION_SYNC_SCALE),
    y: quantizeValue(state.y, HURRICANE_POSITION_SYNC_SCALE),
    radius: quantizeValue(state.radius, HURRICANE_POSITION_SYNC_SCALE),
    rotationRad: quantizeValue(state.rotationRad, HURRICANE_ROTATION_SYNC_SCALE),
  };
};

const isSameHurricaneSyncSnapshot = (
  left: HurricaneSyncSnapshot,
  right: HurricaneSyncSnapshot,
): boolean => {
  return (
    left.x === right.x
    && left.y === right.y
    && left.radius === right.radius
    && left.rotationRad === right.rotationRad
  );
};

/** ハリケーン状態の生成更新と被弾判定を管理する */
export class HurricaneSystem {
  private hasSpawned = false;
  private hurricanes: HurricaneState[] = [];
  private readonly lastHitAtMsByPlayerId = new Map<string, number>();
  private readonly lastSentSnapshotByHurricaneId = new Map<
    string,
    HurricaneSyncSnapshot
  >();

  /** 残り時間しきい値到達時にハリケーンを一度だけ生成する */
  public ensureSpawned(elapsedMs: number): void {
    if (!config.GAME_CONFIG.HURRICANE_ENABLED || this.hasSpawned) {
      return;
    }

    const remainingSec =
      config.GAME_CONFIG.GAME_DURATION_SEC - elapsedMs / 1000;
    if (remainingSec > config.GAME_CONFIG.HURRICANE_SPAWN_REMAINING_SEC) {
      return;
    }

    this.hasSpawned = true;
    this.hurricanes = Array.from(
      { length: config.GAME_CONFIG.HURRICANE_COUNT },
      (_, index) => this.createHurricane(index),
    );
  }

  /** ハリケーンを直線移動させ，境界で反射させる */
  public update(deltaSec: number): void {
    if (this.hurricanes.length === 0) {
      return;
    }

    const maxX = config.GAME_CONFIG.GRID_COLS;
    const maxY = config.GAME_CONFIG.GRID_ROWS;

    this.hurricanes.forEach((hurricane) => {
      hurricane.x += hurricane.vx * deltaSec;
      hurricane.y += hurricane.vy * deltaSec;
      hurricane.rotationRad +=
        config.GAME_CONFIG.HURRICANE_VISUAL_ROTATION_SPEED * deltaSec;

      if (hurricane.x - hurricane.radius < 0) {
        hurricane.x = hurricane.radius;
        hurricane.vx *= -1;
      } else if (hurricane.x + hurricane.radius > maxX) {
        hurricane.x = maxX - hurricane.radius;
        hurricane.vx *= -1;
      }

      if (hurricane.y - hurricane.radius < 0) {
        hurricane.y = hurricane.radius;
        hurricane.vy *= -1;
      } else if (hurricane.y + hurricane.radius > maxY) {
        hurricane.y = maxY - hurricane.radius;
        hurricane.vy *= -1;
      }
    });
  }

  /** 同期配信用のハリケーン状態配列を返す */
  public getUpdatePayload(): HurricaneStatePayload[] {
    const changedPayloads: HurricaneStatePayload[] = [];

    this.hurricanes.forEach((hurricane) => {
      const nextSnapshot = toHurricaneSyncSnapshot(hurricane);
      const lastSnapshot = this.lastSentSnapshotByHurricaneId.get(hurricane.id);

      if (lastSnapshot && isSameHurricaneSyncSnapshot(lastSnapshot, nextSnapshot)) {
        return;
      }

      this.lastSentSnapshotByHurricaneId.set(hurricane.id, nextSnapshot);
      changedPayloads.push({
        id: hurricane.id,
        x: nextSnapshot.x,
        y: nextSnapshot.y,
        radius: nextSnapshot.radius,
        rotationRad: nextSnapshot.rotationRad,
      });
    });

    return changedPayloads;
  }

  /** クールダウン付きで被弾プレイヤーID配列を返す */
  public collectHitPlayerIds(
    players: Map<string, Player>,
    nowMs: number,
  ): string[] {
    if (this.hurricanes.length === 0) {
      return [];
    }

    const hitPlayerIds: string[] = [];
    const hitCooldownMs = config.GAME_CONFIG.HURRICANE_HIT_COOLDOWN_MS;

    players.forEach((player) => {
      const lastHitAtMs = this.lastHitAtMsByPlayerId.get(player.id);
      if (lastHitAtMs !== undefined && nowMs - lastHitAtMs < hitCooldownMs) {
        return;
      }

      const isHit = this.hurricanes.some((hurricane) => {
        const result = checkBombHit({
          bomb: {
            x: hurricane.x,
            y: hurricane.y,
            radius: hurricane.radius,
            teamId: -1,
          },
          player: {
            x: player.x,
            y: player.y,
            radius: config.GAME_CONFIG.PLAYER_RADIUS,
            teamId: player.teamId,
          },
        });

        return result.isHit;
      });

      if (!isHit) {
        return;
      }

      this.lastHitAtMsByPlayerId.set(player.id, nowMs);
      hitPlayerIds.push(player.id);
    });

    return hitPlayerIds;
  }

  /** 状態を初期化する */
  public clear(): void {
    this.hasSpawned = false;
    this.hurricanes = [];
    this.lastHitAtMsByPlayerId.clear();
    this.lastSentSnapshotByHurricaneId.clear();
  }

  /** ハリケーン初期状態を生成する */
  private createHurricane(index: number): HurricaneState {
    const radius = config.GAME_CONFIG.HURRICANE_DIAMETER_GRID / 2;
    const x = this.randomInRange(radius, config.GAME_CONFIG.GRID_COLS - radius);
    const y = this.randomInRange(radius, config.GAME_CONFIG.GRID_ROWS - radius);
    const directionRad = this.randomInRange(0, Math.PI * 2);
    const speed = config.GAME_CONFIG.HURRICANE_MOVE_SPEED;

    return {
      id: `hurricane-${index + 1}`,
      x,
      y,
      vx: Math.cos(directionRad) * speed,
      vy: Math.sin(directionRad) * speed,
      radius,
      rotationRad: directionRad,
    };
  }

  private randomInRange(min: number, max: number): number {
    return min + Math.random() * Math.max(0, max - min);
  }
}
