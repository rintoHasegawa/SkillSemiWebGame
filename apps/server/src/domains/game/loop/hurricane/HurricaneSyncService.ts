/**
 * HurricaneSyncService
 * ハリケーンの同期ペイロード生成を担当する
 */
import { config } from "@server/config";
import { collectSyncDeltaEntries } from "@server/common/syncDelta";
import type { HurricaneStatePayload } from "@repo/shared";
import type {
  HurricaneState,
  HurricaneSyncOutputs,
  HurricaneSyncSnapshot,
} from "./hurricaneTypes.js";

const HURRICANE_RELIABLE_RESYNC_INTERVAL_MS =
  config.GAME_CONFIG.NETWORK_SYNC.HURRICANE_RELIABLE_RESYNC_INTERVAL_MS;

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

/** ハリケーン同期データを生成する */
export class HurricaneSyncService {
  private hasInitialSyncPending = false;
  private lastReliableSyncElapsedMs = -1;
  private readonly lastSentSnapshotByHurricaneId = new Map<
    string,
    HurricaneSyncSnapshot
  >();

  /** 初回全量同期を次回生成するようマークする */
  public markInitialSyncPending(): void {
    this.hasInitialSyncPending = true;
  }

  /** 1ティック分の current/update 同期配列を返す */
  public consumeSyncOutputs(
    elapsedMs: number,
    hurricanes: HurricaneState[],
  ): HurricaneSyncOutputs {
    const snapshotUpdates = this.consumeSnapshotUpdates(elapsedMs, hurricanes);
    const deltaUpdates = this.consumeDeltaUpdates(hurricanes);

    return {
      snapshotUpdates,
      deltaUpdates,
    };
  }

  /** 同期状態を初期化する */
  public clear(): void {
    this.hasInitialSyncPending = false;
    this.lastReliableSyncElapsedMs = -1;
    this.lastSentSnapshotByHurricaneId.clear();
  }

  /** current-hurricanes 用の全量同期を返す */
  private consumeSnapshotUpdates(
    elapsedMs: number,
    hurricanes: HurricaneState[],
  ): HurricaneStatePayload[] {
    if (hurricanes.length === 0) {
      return [];
    }

    if (this.hasInitialSyncPending) {
      this.hasInitialSyncPending = false;
      this.lastReliableSyncElapsedMs = elapsedMs;
      return this.buildSnapshotPayloadAndCommit(hurricanes);
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
    return this.buildSnapshotPayloadAndCommit(hurricanes);
  }

  /** 差分同期配信用のハリケーン状態配列を返す */
  private consumeDeltaUpdates(
    hurricanes: HurricaneState[],
  ): HurricaneStatePayload[] {
    return collectSyncDeltaEntries(
      hurricanes,
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

  /** 現在状態を量子化して送信済み状態へ反映する */
  private buildSnapshotPayloadAndCommit(
    hurricanes: HurricaneState[],
  ): HurricaneStatePayload[] {
    return hurricanes.map((hurricane) => {
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
