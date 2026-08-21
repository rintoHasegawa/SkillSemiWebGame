/**
 * HurricaneSystem
 * ハリケーンの生成と各サービス呼び出しを管理する
 * GameLoop からハリケーン専用責務を分離する
 */
import { config } from "@server/config";
import { Player } from "../entities/player/Player.js";
import {
  HurricaneHitService,
  HurricaneMotionService,
  HurricaneSyncService,
} from "./hurricane/index.js";
import type {
  HurricaneState,
  HurricaneSyncOutputs,
  MapGridSize,
} from "./hurricane/index.js";

/** 1ティック分のハリケーン同期出力 */
export type { HurricaneSyncOutputs } from "./hurricane/index.js";

/** ハリケーン状態の生成更新と被弾判定を管理する */
export class HurricaneSystem {
  private readonly mapSize: MapGridSize;
  private hasSpawned = false;
  private hurricanes: HurricaneState[] = [];
  private readonly motionService: HurricaneMotionService;
  private readonly syncService: HurricaneSyncService;
  private readonly hitService: HurricaneHitService;

  constructor(mapSize: MapGridSize) {
    this.mapSize = mapSize;
    this.motionService = new HurricaneMotionService(mapSize);
    this.syncService = new HurricaneSyncService();
    this.hitService = new HurricaneHitService();
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
    this.syncService.markInitialSyncPending();
    this.hurricanes = Array.from(
      { length: config.GAME_CONFIG.HURRICANE_COUNT },
      (_, index) => this.createHurricane(index),
    );
  }

  /** 1ティック分のハリケーン同期出力をまとめて返す */
  public consumeSyncOutputs(elapsedMs: number): HurricaneSyncOutputs {
    return this.syncService.consumeSyncOutputs(elapsedMs, this.hurricanes);
  }

  /** 現在存在するハリケーンのID一覧を返す */
  public getActiveHurricaneIds(): string[] {
    return this.hurricanes.map((hurricane) => hurricane.id);
  }

  /** ハリケーンを直線移動させ，境界で反射させる */
  public update(deltaSec: number): void {
    this.motionService.update(this.hurricanes, deltaSec);
  }

  /** クールダウン付きで被弾プレイヤーID配列を返す */
  public collectHitPlayerIds(
    players: Map<string, Player>,
    nowMs: number,
  ): string[] {
    return this.hitService.collectHitPlayerIds(this.hurricanes, players, nowMs);
  }

  /** 状態を初期化する */
  public clear(): void {
    this.hasSpawned = false;
    this.hurricanes = [];
    this.syncService.clear();
    this.hitService.clear();
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
}
