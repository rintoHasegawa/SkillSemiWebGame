/**
 * GameLoop
 * ルーム単位の定周期更新を実行し，プレイヤー状態とマップ差分を集約する
 */
import { Player } from "../entities/player/Player.js";
import { MapStore } from "../entities/map/MapStore";
import { getPlayerGridIndex } from "../entities/player/playerPosition.js";
import { config } from "@server/config";
import type { domain, PlaceBombPayload } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import {
  gameDomainLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import {
  BotTurnOrchestrator,
} from "../application/services/bot/index.js";
import { BotControlRegistry } from "../application/services/bot/state/BotControlRegistry.js";
import { setPlayerPosition } from "../entities/player/playerMovement.js";

/** ルーム内ゲーム進行を定周期で実行するループ管理クラス */
export class GameLoop {
  private loopId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startMonotonicTimeMs: number = 0;
  private endMonotonicTimeMs: number = 0;
  private nextTickAtMs: number = 0;
  private readonly maxCatchUpTicks: number = 3;
  private lastSentPlayers: Map<string, domain.game.PlayerPositionUpdate> =
    new Map();
  private botControlRegistry: BotControlRegistry = new BotControlRegistry();
  private botTurnOrchestrator: BotTurnOrchestrator =
    new BotTurnOrchestrator();

  constructor(
    private roomId: string,
    private tickRate: number,
    private players: Map<string, Player>,
    private mapStore: MapStore,
    private onTick: (data: domain.game.TickData) => void,
    private onGameEnd: () => void,
    private onBotPlaceBomb?: (
      ownerId: string,
      payload: PlaceBombPayload,
    ) => void,
  ) {}

  start() {
    // 既にループが回っている場合は何もしない
    if (this.isRunning) return;

    const nowMs = performance.now();
    this.startMonotonicTimeMs = nowMs;
    this.endMonotonicTimeMs =
      nowMs + config.GAME_CONFIG.GAME_DURATION_SEC * 1000;
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

    while (
      nowMs >= this.nextTickAtMs &&
      processedTicks < this.maxCatchUpTicks
    ) {
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
    const monotonicNowMs = performance.now();
    const wallClockNowMs = Date.now();
    const elapsedMs = Math.max(
      0,
      Math.round(monotonicNowMs - this.startMonotonicTimeMs),
    );
    const gridColorsSnapshot = this.mapStore.getGridColorsSnapshot();
    this.updateBotPlayers(wallClockNowMs, elapsedMs, gridColorsSnapshot);
    const tickData = this.buildTickData();
    this.onTick(tickData);
  }

  private updateBotPlayers(
    nowMs: number,
    elapsedMs: number,
    gridColorsSnapshot: number[],
  ): void {
    this.players.forEach((player) => {
      if (
        this.botControlRegistry.isBotControlled(player.id, player.ownerType)
      ) {
        const decision = this.botTurnOrchestrator.decide(
          player.id,
          player,
          gridColorsSnapshot,
          nowMs,
          elapsedMs,
        );
        setPlayerPosition(player, decision.nextX, decision.nextY);

        if (decision.placeBombPayload && this.onBotPlaceBomb) {
          this.onBotPlaceBomb(player.id, decision.placeBombPayload);
        }
      }
    });
  }

  /** 指定プレイヤーがBotなら被弾硬直を適用する */
  public applyBotHitStun(playerId: string, nowMs: number): boolean {
    const player = this.players.get(playerId);
    const isBotControlled =
      !!player &&
      this.botControlRegistry.isBotControlled(player.id, player.ownerType);

    if (!isBotControlled) {
      return false;
    }

    this.botTurnOrchestrator.applyHitStun(playerId, nowMs);
    return true;
  }

  /** 切断プレイヤーをBot制御対象へ昇格する */
  public promotePlayerToBotControl(playerId: string): void {
    this.botControlRegistry.promoteDisconnectedPlayer(playerId);
  }

  /** プレイヤー削除時にBot制御対象から除外する */
  public releaseBotControl(playerId: string): void {
    this.botControlRegistry.releasePlayer(playerId);
  }

  private buildTickData(): domain.game.TickData {
    const activePlayerIds = new Set<string>();
    const playerUpdates = this.collectChangedPlayerUpdates(activePlayerIds);
    this.cleanupInactivePlayerSnapshots(activePlayerIds);

    return {
      playerUpdates,
      cellUpdates: this.mapStore.getAndClearUpdates(),
    };
  }

  private collectChangedPlayerUpdates(
    activePlayerIds: Set<string>,
  ): domain.game.TickData["playerUpdates"] {
    const changedPlayers: domain.game.TickData["playerUpdates"] = [];

    this.players.forEach((player) => {
      activePlayerIds.add(player.id);
      const gridIndex = getPlayerGridIndex(player);
      if (gridIndex !== null) {
        this.mapStore.paintCell(gridIndex, player.teamId);
      }

      // 送信用のプレイヤーデータを構築
      const playerData: domain.game.PlayerPositionUpdate = {
        id: player.id,
        x: player.x,
        y: player.y,
      };

      const lastSentPlayer = this.lastSentPlayers.get(player.id);
      const isChanged =
        !lastSentPlayer ||
        lastSentPlayer.x !== playerData.x ||
        lastSentPlayer.y !== playerData.y;

      if (isChanged) {
        changedPlayers.push(playerData);
        this.lastSentPlayers.set(player.id, playerData);
      }
    });

    return changedPlayers;
  }

  private cleanupInactivePlayerSnapshots(activePlayerIds: Set<string>): void {
    Array.from(this.lastSentPlayers.keys()).forEach((playerId) => {
      if (!activePlayerIds.has(playerId)) {
        this.lastSentPlayers.delete(playerId);
      }
    });
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.botTurnOrchestrator.clear();
    this.botControlRegistry.clear();
    this.lastSentPlayers.clear();

    if (this.loopId) {
      clearTimeout(this.loopId);
      this.loopId = null;
    }

    logEvent(logScopes.GAME_LOOP, {
      event: gameDomainLogEvents.GAME_LOOP,
      result: logResults.STOPPED,
      roomId: this.roomId,
      elapsedMs: Math.max(
        0,
        Math.round(performance.now() - this.startMonotonicTimeMs),
      ),
    });
  }
}
