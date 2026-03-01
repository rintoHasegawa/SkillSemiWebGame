/**
 * GameLoop
 * ルーム単位の定周期更新を実行し，プレイヤー状態とマップ差分を集約する
 */
import { Player } from "../entities/player/Player.js";
import { MapStore } from "../entities/map/MapStore";
import { getPlayerGridIndex } from "../entities/player/playerPosition.js";
import { config } from "@server/config";
import { domain } from "@repo/shared";
import type { PlaceBombPayload } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import {
  gameDomainLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import {
  BotTurnOrchestrator,
  isBotPlayerId,
  type BotPlayerId,
} from "../application/services/bot/index.js";
import { setPlayerPosition } from "../entities/player/playerMovement.js";
import type { ActiveBombRegistry } from "../entities/bomb/ActiveBombRegistry.js";

const { checkBombHit } = domain.game.bombHit;

/** GameLoop の初期化入力 */
export type GameLoopOptions = {
  roomId: string;
  tickRate: number;
  players: Map<string, Player>;
  mapStore: MapStore;
  activeBombRegistry: ActiveBombRegistry;
  callbacks: GameLoopCallbacks;
};

/** GameLoop のコールバック集合 */
export type GameLoopCallbacks = {
  onTick: (data: domain.game.tick.TickData) => void;
  onGameEnd: () => void;
  onBotPlaceBomb?: (ownerId: string, payload: PlaceBombPayload) => void;
  onBotBombHit?: (targetPlayerId: string, bombId: string) => void;
};

/** ルーム内ゲーム進行を定周期で実行するループ管理クラス */
export class GameLoop {
  private loopId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startMonotonicTimeMs: number = 0;
  private endMonotonicTimeMs: number = 0;
  private nextTickAtMs: number = 0;
  private readonly maxCatchUpTicks: number = 3;
  private lastSentPlayers: Map<string, domain.game.tick.PlayerPositionUpdate> =
    new Map();
  private disconnectedBotControlledPlayerIds: Set<string> = new Set();
  private botTurnOrchestrator: BotTurnOrchestrator =
    new BotTurnOrchestrator();

  private readonly roomId: string;
  private readonly tickRate: number;
  private readonly players: Map<string, Player>;
  private readonly mapStore: MapStore;
  private readonly activeBombRegistry: ActiveBombRegistry;
  private readonly callbacks: GameLoopCallbacks;

  constructor(options: GameLoopOptions) {
    this.roomId = options.roomId;
    this.tickRate = options.tickRate;
    this.players = options.players;
    this.mapStore = options.mapStore;
    this.activeBombRegistry = options.activeBombRegistry;
    this.callbacks = options.callbacks;
  }

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
      this.callbacks.onGameEnd();
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
        this.callbacks.onGameEnd();
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
    this.detectBotBombHits(elapsedMs, wallClockNowMs);
    const tickData = this.buildTickData();
    this.callbacks.onTick(tickData);
  }

  private updateBotPlayers(
    nowMs: number,
    elapsedMs: number,
    gridColorsSnapshot: number[],
  ): void {
    this.players.forEach((player) => {
      if (
        isBotPlayerId(player.id) ||
        this.disconnectedBotControlledPlayerIds.has(player.id)
      ) {
        const decision = this.botTurnOrchestrator.decide(
          player.id as BotPlayerId,
          player,
          gridColorsSnapshot,
          nowMs,
          elapsedMs,
        );
        setPlayerPosition(player, decision.nextX, decision.nextY);

        if (decision.placeBombPayload && this.callbacks.onBotPlaceBomb) {
          this.callbacks.onBotPlaceBomb(player.id, decision.placeBombPayload);
        }
      }
    });
  }

  /** 爆発済み爆弾とBotプレイヤーの当たり判定を実行する */
  private detectBotBombHits(elapsedMs: number, nowMs: number): void {
    const onBotBombHit = this.callbacks.onBotBombHit;
    if (!onBotBombHit) return;

    const explodedBombs =
      this.activeBombRegistry.collectExplodedBombs(elapsedMs);
    if (explodedBombs.length === 0) return;

    this.players.forEach((player) => {
      const isBotControlled =
        isBotPlayerId(player.id) ||
        this.disconnectedBotControlledPlayerIds.has(player.id);
      if (!isBotControlled) return;

      for (const bomb of explodedBombs) {
        const result = checkBombHit({
          bomb: {
            x: bomb.x,
            y: bomb.y,
            radius: config.GAME_CONFIG.BOMB_RADIUS_GRID,
            teamId: bomb.ownerTeamId,
          },
          player: {
            x: player.x,
            y: player.y,
            radius: config.GAME_CONFIG.PLAYER_RADIUS,
            teamId: player.teamId,
          },
        });

        if (result.isHit) {
          this.botTurnOrchestrator.applyHitStun(
            player.id as BotPlayerId,
            nowMs,
          );
          onBotBombHit(player.id, bomb.bombId);
        }
      }
    });
  }

  /** 切断プレイヤーをBot制御対象へ昇格する */
  public promotePlayerToBotControl(playerId: string): void {
    this.disconnectedBotControlledPlayerIds.add(playerId);
  }

  /** プレイヤー削除時にBot制御対象から除外する */
  public releaseBotControl(playerId: string): void {
    this.disconnectedBotControlledPlayerIds.delete(playerId);
  }

  private buildTickData(): domain.game.tick.TickData {
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
  ): domain.game.tick.TickData["playerUpdates"] {
    const changedPlayers: domain.game.tick.TickData["playerUpdates"] = [];

    this.players.forEach((player) => {
      activePlayerIds.add(player.id);
      const gridIndex = getPlayerGridIndex(player);
      if (gridIndex !== null) {
        this.mapStore.paintCell(gridIndex, player.teamId);
      }

      // 送信用のプレイヤーデータを構築
      const playerData: domain.game.tick.PlayerPositionUpdate = {
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
    this.disconnectedBotControlledPlayerIds.clear();
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
