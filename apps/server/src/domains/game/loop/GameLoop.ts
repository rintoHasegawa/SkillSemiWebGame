/**
 * GameLoop
 * ルーム単位の定周期更新を実行し，プレイヤー状態とマップ差分を集約する
 */
import { Player } from "../entities/player/Player.js";
import { MapStore } from "../entities/map/MapStore";
import { getPlayerGridIndex } from "../entities/player/playerPosition.js";
import { config } from "@server/config";
import type { gameTypes } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { gameDomainLogEvents, logResults, logScopes } from "@server/logging/index";

/** ルーム内ゲーム進行を定周期で実行するループ管理クラス */
export class GameLoop {
  private loopId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startMonotonicTimeMs: number = 0;
  private endMonotonicTimeMs: number = 0;
  private nextTickAtMs: number = 0;
  private readonly maxCatchUpTicks: number = 3;
  private lastSentPlayers: Map<string, gameTypes.TickData["playerUpdates"][number]> = new Map();

  constructor(
    private roomId: string,
    private tickRate: number,
    private players: Map<string, Player>,
    private mapStore: MapStore,
    private onTick: (data: gameTypes.TickData) => void,
    private onGameEnd: () => void   // ゲーム終了時のコールバック
  ) {}

  start() {
    // 既にループが回っている場合は何もしない
    if (this.isRunning) return;

    const nowMs = performance.now();
    this.startMonotonicTimeMs = nowMs;
    this.endMonotonicTimeMs = nowMs + config.GAME_CONFIG.GAME_DURATION_SEC * 1000;
    this.nextTickAtMs = nowMs + this.tickRate;
    this.lastSentPlayers.clear();
    this.isRunning = true;
    this.scheduleNextTick();

    logEvent(logScopes.GAME_LOOP, {
      event: gameDomainLogEvents.GAME_LOOP,
      result: logResults.STARTED,
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
    const changedPlayers: gameTypes.TickData["playerUpdates"] = [];

    // 1. 各プレイヤーの座標処理とマス塗りの判定
    this.players.forEach((player) => {

      const gridIndex = getPlayerGridIndex(player);
      if (gridIndex !== null) {
        this.mapStore.paintCell(gridIndex, player.teamId);
      }

      // 送信用のプレイヤーデータを構築
      const playerData = {
        id: player.id,
        x: player.x,
        y: player.y,
        teamId: player.teamId,
      };

      const lastSentPlayer = this.lastSentPlayers.get(player.id);
      const isChanged =
        !lastSentPlayer ||
        lastSentPlayer.x !== playerData.x ||
        lastSentPlayer.y !== playerData.y ||
        lastSentPlayer.teamId !== playerData.teamId;

      if (isChanged) {
        changedPlayers.push(playerData);
        this.lastSentPlayers.set(player.id, playerData);
      }
    });

    // ルームから離脱したプレイヤーの送信状態をクリーンアップする
    Array.from(this.lastSentPlayers.keys()).forEach((playerId) => {
      if (!this.players.has(playerId)) {
        this.lastSentPlayers.delete(playerId);
      }
    });

    // 2. マスの差分（Diff）を取得
    const cellUpdates = this.mapStore.getAndClearUpdates();

    // 3. 通信層（GameHandler）へデータを渡す
    this.onTick({
      playerUpdates: changedPlayers,
      cellUpdates: cellUpdates,
    });
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.lastSentPlayers.clear();

    if (this.loopId) {
      clearTimeout(this.loopId);
      this.loopId = null;
    }

    logEvent(logScopes.GAME_LOOP, {
      event: gameDomainLogEvents.GAME_LOOP,
      result: logResults.STOPPED,
      roomId: this.roomId,
      elapsedMs: Math.max(0, Math.round(performance.now() - this.startMonotonicTimeMs)),
    });
  }
}