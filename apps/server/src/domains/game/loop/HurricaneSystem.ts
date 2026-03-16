/**
 * HurricaneSystem
 * ハリケーンの生成，移動，同期データ化，被弾検知を管理する
 * GameLoop からハリケーン専用責務を分離する
 */
import { config } from "@server/config";
import { collectSyncDeltaEntries } from "@server/common/syncDelta";
import { domain, type HurricaneStatePayload } from "@repo/shared";
import { Player } from "../entities/player/Player.js";

const { checkBombHit } = domain.game.bombHit;
const HURRICANE_RELIABLE_RESYNC_INTERVAL_MS =
  config.GAME_CONFIG.NETWORK_SYNC.HURRICANE_RELIABLE_RESYNC_INTERVAL_MS;

/** 1ティック分のハリケーン同期出力 */
export type HurricaneSyncOutputs = {
  snapshotUpdates: HurricaneStatePayload[];
  deltaUpdates: HurricaneStatePayload[];
};

type HurricaneState = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotationRad: number;
};

type MapGridSize = {
  gridCols: number;
  gridRows: number;
};

type HurricaneSyncSnapshot = {
  x: number;
  y: number;
  radius: number;
  rotationRad: number;
};

const quantizeValue = (value: number, scale: number): number => {
  return Math.round(value * scale) / scale;
};

const toHurricaneSyncSnapshot = (
  state: HurricaneState,
): HurricaneSyncSnapshot => {
  return {
    x: quantizeValue(
      state.x,
      config.GAME_CONFIG.NETWORK_SYNC.HURRICANE_POSITION_QUANTIZE_SCALE,
    ),
    y: quantizeValue(
      state.y,
      config.GAME_CONFIG.NETWORK_SYNC.HURRICANE_POSITION_QUANTIZE_SCALE,
    ),
    radius: quantizeValue(
      state.radius,
      config.GAME_CONFIG.NETWORK_SYNC.HURRICANE_POSITION_QUANTIZE_SCALE,
    ),
    rotationRad: quantizeValue(
      state.rotationRad,
      config.GAME_CONFIG.NETWORK_SYNC.HURRICANE_ROTATION_QUANTIZE_SCALE,
    ),
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
  private readonly mapSize: MapGridSize;
  private hasSpawned = false;
  private hasInitialSyncPending = false;
  private lastReliableSyncElapsedMs = -1;
  private hurricanes: HurricaneState[] = [];
  private readonly lastHitAtMsByPlayerId = new Map<string, number>();
  private readonly lastSentSnapshotByHurricaneId = new Map<
    string,
    HurricaneSyncSnapshot
  >();

  constructor(mapSize: MapGridSize) {
    this.mapSize = mapSize;
  }

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
    this.hasInitialSyncPending = true;
    this.hurricanes = Array.from(
      { length: config.GAME_CONFIG.HURRICANE_COUNT },
      (_, index) => this.createHurricane(index),
    );
  }

  /** 1ティック分のハリケーン同期出力をまとめて返す */
  public consumeSyncOutputs(elapsedMs: number): HurricaneSyncOutputs {
    const snapshotUpdates = this.consumeSnapshotUpdates(elapsedMs);
    const deltaUpdates = this.consumeDeltaUpdates();

    return {
      snapshotUpdates,
      deltaUpdates,
    };
  }

  /** ハリケーンを直線移動させ，境界で反射させる */
  public update(deltaSec: number): void {
    if (this.hurricanes.length === 0) {
      return;
    }

    const maxX = this.mapSize.gridCols;
    const maxY = this.mapSize.gridRows;

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

  /** 差分同期配信用のハリケーン状態配列を返す */
  private consumeDeltaUpdates(): HurricaneStatePayload[] {
    return collectSyncDeltaEntries(
      this.hurricanes,
      this.lastSentSnapshotByHurricaneId,
      {
        selectId: (hurricane) => hurricane.id,
        toSnapshot: (hurricane) => toHurricaneSyncSnapshot(hurricane),
        isSameSnapshot: (left, right) =>
          isSameHurricaneSyncSnapshot(left, right),
      },
    ).map((entry) => {
      const { item, snapshot } = entry;
      return {
        id: item.id,
        x: snapshot.x,
        y: snapshot.y,
        radius: snapshot.radius,
        rotationRad: snapshot.rotationRad,
      };
    });
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
    this.hasInitialSyncPending = false;
    this.lastReliableSyncElapsedMs = -1;
    this.hurricanes = [];
    this.lastHitAtMsByPlayerId.clear();
    this.lastSentSnapshotByHurricaneId.clear();
  }

  /** ハリケーン初期状態を生成する */
  private createHurricane(index: number): HurricaneState {
    const radius = config.GAME_CONFIG.HURRICANE_DIAMETER_GRID / 2;
    const x = this.randomInRange(radius, this.mapSize.gridCols - radius);
    const y = this.randomInRange(radius, this.mapSize.gridRows - radius);
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

  /**
   * current-hurricanes 用の全量同期を返す
   * 初回同期と定期再同期の両方で同じ全量ペイロードを利用する
   */
  private consumeSnapshotUpdates(elapsedMs: number): HurricaneStatePayload[] {
    if (this.hurricanes.length === 0) {
      return [];
    }

    if (this.hasInitialSyncPending) {
      this.hasInitialSyncPending = false;
      this.lastReliableSyncElapsedMs = elapsedMs;
      return this.buildSnapshotPayloadAndCommit();
    }

    if (this.lastReliableSyncElapsedMs < 0) {
      this.lastReliableSyncElapsedMs = elapsedMs;
      return [];
    }

    if (
      elapsedMs - this.lastReliableSyncElapsedMs
      < HURRICANE_RELIABLE_RESYNC_INTERVAL_MS
    ) {
      return [];
    }

    this.lastReliableSyncElapsedMs = elapsedMs;
    return this.buildSnapshotPayloadAndCommit();
  }

  /** 現在状態を量子化スナップショットへ変換して送信済み状態へ反映する */
  private buildSnapshotPayloadAndCommit(): HurricaneStatePayload[] {
    return this.hurricanes.map((hurricane) => {
      const snapshot = toHurricaneSyncSnapshot(hurricane);
      this.lastSentSnapshotByHurricaneId.set(hurricane.id, snapshot);

      return {
        id: hurricane.id,
        x: snapshot.x,
        y: snapshot.y,
        radius: snapshot.radius,
        rotationRad: snapshot.rotationRad,
      };
    });
  }
}
