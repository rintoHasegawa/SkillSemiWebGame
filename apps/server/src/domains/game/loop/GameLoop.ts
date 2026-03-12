/**
 * GameLoop
 * ルーム単位の定周期更新を実行し，プレイヤー状態とマップ差分を集約する
 */
import { Player } from "../entities/player/Player.js";
import { MapStore } from "../entities/map/MapStore";
import { getPlayerGridIndex } from "../entities/player/playerPosition.js";
import {
  resolveUncontestedCells,
  isCellPaintable,
  type PlayerGridEntry,
} from "../entities/map/mapContestResolver.js";
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
  onHurricanePlayerHit?: (targetPlayerId: string) => void;
};

/** プレイヤーのグリッド位置キャッシュを含むエントリ */
type PlayerGridCacheEntry = PlayerGridEntry & { player: Player };

type HurricaneState = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotationRad: number;
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
  private botTurnOrchestrator: BotTurnOrchestrator = new BotTurnOrchestrator();
  private readonly botReceivedHitCountById = new Map<string, number>();
  private hasSpawnedHurricanes = false;
  private hurricanes: HurricaneState[] = [];
  private readonly lastHurricaneHitAtMsByTargetId = new Map<string, number>();

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
    this.ensureHurricanesSpawned(elapsedMs);
    this.updateHurricanes(this.tickRate / 1000);
    this.detectHurricaneHits(wallClockNowMs, elapsedMs);
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
          // 被弾カウントを更新し，閾値到達でリスポーンスタン，それ以外は通常スタンを適用する
          const prevCount = this.botReceivedHitCountById.get(player.id) ?? 0;
          const nextCount = prevCount + 1;

          if (nextCount >= config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT) {
            this.botReceivedHitCountById.set(player.id, 0);
            this.botTurnOrchestrator.applyRespawnStun(
              player.id as BotPlayerId,
              nowMs,
            );
          } else {
            this.botReceivedHitCountById.set(player.id, nextCount);
            this.botTurnOrchestrator.applyHitStun(
              player.id as BotPlayerId,
              nowMs,
            );
          }

          // 爆弾所有者の bombHitCount を加算する
          const owner = this.players.get(bomb.ownerPlayerId);
          if (owner) {
            owner.bombHitCount += 1;
          }

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
      hurricaneUpdates: this.hurricanes.map((hurricane) => ({
        id: hurricane.id,
        x: hurricane.x,
        y: hurricane.y,
        radius: hurricane.radius,
        rotationRad: hurricane.rotationRad,
      })),
    };
  }

  /** 残り時間しきい値到達時にハリケーンを一度だけ生成する */
  private ensureHurricanesSpawned(elapsedMs: number): void {
    if (!config.GAME_CONFIG.HURRICANE_ENABLED || this.hasSpawnedHurricanes) {
      return;
    }

    const remainingSec =
      config.GAME_CONFIG.GAME_DURATION_SEC - elapsedMs / 1000;
    if (remainingSec > config.GAME_CONFIG.HURRICANE_SPAWN_REMAINING_SEC) {
      return;
    }

    this.hasSpawnedHurricanes = true;
    this.hurricanes = Array.from(
      { length: config.GAME_CONFIG.HURRICANE_COUNT },
      (_, index) => this.createHurricane(index),
    );
  }

  /** ハリケーンを直線移動させ，境界で反射させる */
  private updateHurricanes(deltaSec: number): void {
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

  /** ハリケーン接触を検知し，クールダウン付きで被弾通知を配信する */
  private detectHurricaneHits(nowMs: number, _elapsedMs: number): void {
    if (this.hurricanes.length === 0) {
      return;
    }

    const hitCooldownMs = config.GAME_CONFIG.HURRICANE_HIT_COOLDOWN_MS;

    this.players.forEach((player) => {
      const lastHitAtMs = this.lastHurricaneHitAtMsByTargetId.get(player.id);
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

      this.lastHurricaneHitAtMsByTargetId.set(player.id, nowMs);

      if (
        isBotPlayerId(player.id) ||
        this.disconnectedBotControlledPlayerIds.has(player.id)
      ) {
        const botPlayerId = player.id as BotPlayerId;
        const prevCount = this.botReceivedHitCountById.get(player.id) ?? 0;
        const nextCount = prevCount + 1;

        if (nextCount >= config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT) {
          this.botReceivedHitCountById.set(player.id, 0);
          this.botTurnOrchestrator.applyRespawnStun(botPlayerId, nowMs);
        } else {
          this.botReceivedHitCountById.set(player.id, nextCount);
          this.botTurnOrchestrator.applyHitStun(botPlayerId, nowMs);
        }
      }

      this.callbacks.onHurricanePlayerHit?.(player.id);
    });
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

  private collectChangedPlayerUpdates(
    activePlayerIds: Set<string>,
  ): domain.game.tick.TickData["playerUpdates"] {
    const changedPlayers: domain.game.tick.TickData["playerUpdates"] = [];

    // 全プレイヤーのグリッド位置を1度だけ計算してキャッシュする
    const gridEntries: PlayerGridCacheEntry[] = [];
    this.players.forEach((player) => {
      gridEntries.push({
        playerId: player.id,
        gridIndex: getPlayerGridIndex(player),
        teamId: player.teamId,
        player,
      });
    });

    // 競合判定を経てマップを塗る
    this.paintUncontestedCells(gridEntries);

    // プレイヤー差分を収集する
    for (const { playerId, player } of gridEntries) {
      activePlayerIds.add(playerId);

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
    }

    return changedPlayers;
  }

  /** 競合判定を行い，単一チームが占有するセルのみを塗る */
  private paintUncontestedCells(gridEntries: PlayerGridCacheEntry[]): void {
    const cellTeamMap = resolveUncontestedCells(gridEntries);

    for (const { gridIndex, player } of gridEntries) {
      if (gridIndex !== null && isCellPaintable(cellTeamMap, gridIndex)) {
        const changed = this.mapStore.paintCell(gridIndex, player.teamId);
        if (changed) {
          player.paintCount += 1;
        }
      }
    }
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
    this.hasSpawnedHurricanes = false;
    this.hurricanes = [];
    this.lastHurricaneHitAtMsByTargetId.clear();

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
