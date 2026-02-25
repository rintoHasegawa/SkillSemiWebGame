/**
 * GameLoop
 * ルーム単位の定周期更新を実行し，プレイヤー状態とマップ差分を集約する
 */
import { Player } from "../entities/player/Player.js";
import { MapStore } from "../entities/map/MapStore";
import { getPlayerGridIndex } from "../entities/player/playerPosition.js";
import { config } from "@repo/shared";
import type { gridMapTypes } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";

// コールバックで渡すデータの型定義
/** 1ティック分のプレイヤー情報とマップ差分を表すデータ */
export interface TickData {
  players: {
    id: string;
    x: number;
    y: number;
    teamId: number;
  }[];
  cellUpdates: gridMapTypes.CellUpdate[];
}

/** ルーム内ゲーム進行を定周期で実行するループ管理クラス */
export class GameLoop {
  private loopId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startMonotonicTimeMs: number = 0;
  private endMonotonicTimeMs: number = 0;
  private nextTickAtMs: number = 0;
  private readonly maxCatchUpTicks: number = 3;

  constructor(
    private roomId: string,
    private tickRate: number,
    private players: Map<string, Player>,
    private mapStore: MapStore,
    private onTick: (data: TickData) => void,
    private onGameEnd: () => void   // ゲーム終了時のコールバック
  ) {}

  start() {
    // 既にループが回っている場合は何もしない
    if (this.isRunning) return;

    const nowMs = performance.now();
    this.startMonotonicTimeMs = nowMs;
    this.endMonotonicTimeMs = nowMs + config.GAME_CONFIG.GAME_DURATION_SEC * 1000;
    this.nextTickAtMs = nowMs + this.tickRate;
    this.isRunning = true;
    this.scheduleNextTick();

    logEvent("GameLoop", {
      event: "GAME_LOOP",
      result: "started",
      roomId: this.roomId,
      tickRate: this.tickRate,
    });
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;

    const delayMs = Math.max(0, this.nextTickAtMs - performance.now());
    this.loopId = setTimeout(() => {
      this.loopId = null;
      this.runTickCycle();
    }, delayMs);
  }

  private runTickCycle(): void {
    if (!this.isRunning) return;

    let nowMs = performance.now();
    if (nowMs >= this.endMonotonicTimeMs) {
      this.stop();
      this.onGameEnd();
      return;
    }

    let processedTicks = 0;

    while (nowMs >= this.nextTickAtMs && processedTicks < this.maxCatchUpTicks) {
      this.processSingleTick();
      this.nextTickAtMs += this.tickRate;
      processedTicks += 1;

      nowMs = performance.now();
      if (nowMs >= this.endMonotonicTimeMs) {
        this.stop();
        this.onGameEnd();
        return;
      }
    }

    if (processedTicks === this.maxCatchUpTicks && nowMs >= this.nextTickAtMs) {
      this.nextTickAtMs = nowMs + this.tickRate;
    }

    this.scheduleNextTick();
  }

  private processSingleTick(): void {
    const playersData: TickData["players"] = [];

    // 1. 各プレイヤーの座標処理とマス塗りの判定
    this.players.forEach((player) => {

      const gridIndex = getPlayerGridIndex(player);
      if (gridIndex !== null) {
        this.mapStore.paintCell(gridIndex, player.teamId);
      }

      // 送信用のプレイヤーデータを構築
      playersData.push({
        id: player.id,
        x: player.x,
        y: player.y,
        teamId: player.teamId,
      });
    });

    // 2. マスの差分（Diff）を取得
    const cellUpdates = this.mapStore.getAndClearUpdates();

    // 3. 通信層（GameHandler）へデータを渡す
    this.onTick({
      players: playersData,
      cellUpdates: cellUpdates,
    });
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.loopId) {
      clearTimeout(this.loopId);
      this.loopId = null;
    }

    logEvent("GameLoop", {
      event: "GAME_LOOP",
      result: "stopped",
      roomId: this.roomId,
      elapsedMs: Math.max(0, Math.round(performance.now() - this.startMonotonicTimeMs)),
    });
  }
}