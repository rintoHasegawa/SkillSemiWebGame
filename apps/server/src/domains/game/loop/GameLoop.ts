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
import { chooseNextTarget } from "../application/services/bot/policies/TargetSelectionPolicy.js";
import { setPlayerPosition } from "../entities/player/playerMovement.js";
import type { ActiveBombRegistry } from "../entities/bomb/ActiveBombRegistry.js";
import { HurricaneSystem } from "./HurricaneSystem";
import type { GameClock } from "./GameClock";

const { checkBombHit } = domain.game.bombHit;

/** GameLoop の初期化入力 */
export type GameLoopOptions = {
  roomId: string;
  tickRate: number;
  gridCols: number;
  gridRows: number;
  players: Map<string, Player>;
  mapStore: MapStore;
  activeBombRegistry: ActiveBombRegistry;
  /** セッションと共有するゲーム時間軸 */
  gameClock: GameClock;
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

/** 1秒間のパフォーマンス統計蓄積バッファ */
type PerfAccumulator = {
  windowStartRawElapsedMs: number;
  tickCount: number;
  totalTickMs: number;
  maxTickMs: number;
  totalPayloadBytes: number;
};

/** ルーム内ゲーム進行を定周期で実行するループ管理クラス */
export class GameLoop {
  private loopId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  /** ゲーム終了となる原点からの経過ms */
  private endRawElapsedMs: number = 0;
  /** 次tickを実行する原点からの経過ms */
  private nextTickAtRawElapsedMs: number = 0;
  private readonly maxCatchUpTicks: number = 3;
  private lastSentPlayers: Map<string, domain.game.tick.PlayerPositionUpdate> =
    new Map();
  private disconnectedBotControlledPlayerIds: Set<string> = new Set();
  private readonly mapSize: { gridCols: number; gridRows: number };
  private botTurnOrchestrator: BotTurnOrchestrator;
  private readonly botReceivedHitCountById = new Map<string, number>();
  private readonly hurricaneSystem: HurricaneSystem;
  private perfAccumulator: PerfAccumulator = {
    windowStartRawElapsedMs: 0,
    tickCount: 0,
    totalTickMs: 0,
    maxTickMs: 0,
    totalPayloadBytes: 0,
  };

  private readonly roomId: string;
  private readonly tickRate: number;
  private readonly players: Map<string, Player>;
  private readonly mapStore: MapStore;
  private readonly activeBombRegistry: ActiveBombRegistry;
  private readonly gameClock: GameClock;
  private readonly callbacks: GameLoopCallbacks;

  constructor(options: GameLoopOptions) {
    this.roomId = options.roomId;
    this.tickRate = options.tickRate;
    this.mapSize = {
      gridCols: options.gridCols,
      gridRows: options.gridRows,
    };
    this.botTurnOrchestrator = new BotTurnOrchestrator(this.mapSize);
    this.hurricaneSystem = new HurricaneSystem(this.mapSize);
    this.players = options.players;
    this.mapStore = options.mapStore;
    this.activeBombRegistry = options.activeBombRegistry;
    this.gameClock = options.gameClock;
    this.callbacks = options.callbacks;
  }

  /**
   * ゲーム開始前にJITコンパイルを誘発し，ボットごとに初期目標距離をずらす
   * startDelayMs の待機中に呼ぶことで tick1 の chooseNextTarget 集中を防ぐ
   */
  public warmUp(): void {
    const gridColorsView = this.mapStore.getGridColorsView();
    const maxChain = 4;
    let botIndex = 0;

    this.players.forEach((player) => {
      if (
        !isBotPlayerId(player.id) &&
        !this.disconnectedBotControlledPlayerIds.has(player.id)
      ) {
        return;
      }

      // decide() を1回呼んでJITコンパイルを誘発する
      this.botTurnOrchestrator.decide(
        player.id as BotPlayerId,
        player,
        gridColorsView,
        0,
      );

      // ボットごとに chooseNextTarget をチェーンして初期目標距離をずらす
      const chainCount = (botIndex % maxChain) + 1;
      const currentCol = Math.floor(player.x);
      const currentRow = Math.floor(player.y);
      let targetCol = currentCol;
      let targetRow = currentRow;
      for (let i = 0; i < chainCount; i++) {
        const next = chooseNextTarget(
          targetCol,
          targetRow,
          gridColorsView,
          this.mapSize,
        );
        targetCol = next.col;
        targetRow = next.row;
      }

      // チェーンで求めた目標を BotTurnOrchestrator の状態に上書きする
      this.botTurnOrchestrator.overrideTarget(
        player.id as BotPlayerId,
        targetCol,
        targetRow,
      );

      botIndex++;
    });
  }

  /**
   * ゲーム時間軸の原点を確定し，開始待機ぶんずらした初回tickから定周期実行を始める
   * カウントダウン中にtickを回さないよう初回tickは 原点 + startDelayMs + tickRate に置く
   * 開始待機時間は時計と食い違わないよう GameClock から読む
   */
  public start(): void {
    // 既にループが回っている場合は何もしない
    if (this.isRunning) return;

    const startDelayMs = this.gameClock.getStartDelayMs();
    this.gameClock.start();
    this.endRawElapsedMs =
      startDelayMs + config.GAME_CONFIG.GAME_DURATION_SEC * 1000;
    this.nextTickAtRawElapsedMs = startDelayMs + this.tickRate;
    this.lastSentPlayers.clear();
    this.perfAccumulator = {
      windowStartRawElapsedMs: this.gameClock.getRawElapsedMs(),
      tickCount: 0,
      totalTickMs: 0,
      maxTickMs: 0,
      totalPayloadBytes: 0,
    };
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

    const delayMs = Math.max(
      0,
      this.nextTickAtRawElapsedMs - this.gameClock.getRawElapsedMs(),
    );
    this.loopId = setTimeout(() => {
      this.loopId = null;
      this.runTickCycle();
    }, delayMs);
  }

  private runTickCycle(): void {
    if (!this.isRunning) return;

    let rawElapsedMs = this.gameClock.getRawElapsedMs();
    if (rawElapsedMs >= this.endRawElapsedMs) {
      this.stop();
      this.callbacks.onGameEnd();
      return;
    }

    let processedTicks = 0;

    while (
      rawElapsedMs >= this.nextTickAtRawElapsedMs &&
      processedTicks < this.maxCatchUpTicks
    ) {
      this.processSingleTick();
      this.nextTickAtRawElapsedMs += this.tickRate;
      processedTicks += 1;

      rawElapsedMs = this.gameClock.getRawElapsedMs();
      if (rawElapsedMs >= this.endRawElapsedMs) {
        this.stop();
        this.callbacks.onGameEnd();
        return;
      }
    }

    if (
      processedTicks === this.maxCatchUpTicks &&
      rawElapsedMs >= this.nextTickAtRawElapsedMs
    ) {
      this.nextTickAtRawElapsedMs = rawElapsedMs + this.tickRate;
    }

    this.scheduleNextTick();
  }

  private processSingleTick(): void {
    const tickStartRawElapsedMs = this.gameClock.getRawElapsedMs();
    const elapsedMs = Math.round(this.gameClock.getElapsedMs());
    this.hurricaneSystem.ensureSpawned(elapsedMs);
    this.hurricaneSystem.update(this.tickRate / 1000);
    this.detectHurricaneHits(elapsedMs);
    const gridColorsView = this.mapStore.getGridColorsView();
    this.updateBotPlayers(elapsedMs, gridColorsView);
    this.detectBotBombHits(elapsedMs);
    const tickData = this.buildTickData(elapsedMs);
    this.callbacks.onTick(tickData);

    // パフォーマンス統計を蓄積し，1秒ごとにログ出力する
    const tickMs = this.gameClock.getRawElapsedMs() - tickStartRawElapsedMs;
    const payloadBytes = JSON.stringify(tickData).length;
    this.accumulatePerfStats(tickMs, payloadBytes);
  }

  /** tick処理時間とペイロードサイズを蓄積し，1秒経過でログを出力する */
  private accumulatePerfStats(tickMs: number, payloadBytes: number): void {
    const acc = this.perfAccumulator;
    acc.tickCount += 1;
    acc.totalTickMs += tickMs;
    acc.maxTickMs = Math.max(acc.maxTickMs, tickMs);
    acc.totalPayloadBytes += payloadBytes;

    const windowMs =
      this.gameClock.getRawElapsedMs() - acc.windowStartRawElapsedMs;
    if (windowMs < 1000) return;

    const playerCount = this.players.size;
    const avgTickMs =
      acc.tickCount > 0
        ? Math.round((acc.totalTickMs / acc.tickCount) * 10) / 10
        : 0;
    const maxTickMs = Math.round(acc.maxTickMs * 10) / 10;
    const cpuUsagePct =
      Math.round((acc.totalTickMs / windowMs) * 1000) / 10;
    const avgPayloadBytesPerTick =
      acc.tickCount > 0 ? Math.round(acc.totalPayloadBytes / acc.tickCount) : 0;

    // 集計窓は負荷時に1秒を超えるため，実際の窓経過秒で割って毎秒換算する
    const windowSec = windowMs / 1000;
    const outboundBytesPerSec = Math.round(
      (acc.totalPayloadBytes * playerCount) / windowSec,
    );

    logEvent(logScopes.GAME_LOOP, {
      event: gameDomainLogEvents.PERF_STATS,
      result: logResults.STATS,
      roomId: this.roomId,
      playerCount,
      tickCount: acc.tickCount,
      avgTickMs,
      maxTickMs,
      cpuUsagePct,
      avgPayloadBytesPerTick,
      outboundBytesPerSec,
    });

    // ウィンドウをリセット
    this.perfAccumulator = {
      windowStartRawElapsedMs: this.gameClock.getRawElapsedMs(),
      tickCount: 0,
      totalTickMs: 0,
      maxTickMs: 0,
      totalPayloadBytes: 0,
    };
  }

  private updateBotPlayers(
    elapsedMs: number,
    gridColorsView: readonly number[],
  ): void {
    this.players.forEach((player) => {
      if (
        isBotPlayerId(player.id) ||
        this.disconnectedBotControlledPlayerIds.has(player.id)
      ) {
        const decision = this.botTurnOrchestrator.decide(
          player.id as BotPlayerId,
          player,
          gridColorsView,
          elapsedMs,
        );
        setPlayerPosition({
          player,
          x: decision.nextX,
          y: decision.nextY,
          mapSize: this.mapSize,
        });

        if (decision.placeBombPayload && this.callbacks.onBotPlaceBomb) {
          this.callbacks.onBotPlaceBomb(player.id, decision.placeBombPayload);
        }
      }
    });
  }

  /** 爆発済み爆弾とBotプレイヤーの当たり判定を実行する */
  private detectBotBombHits(elapsedMs: number): void {
    // 被弾コールバックの有無に関わらず回収し，爆発済み爆弾の残留を防ぐ
    const explodedBombs =
      this.activeBombRegistry.collectExplodedBombs(elapsedMs);

    const onBotBombHit = this.callbacks.onBotBombHit;
    if (!onBotBombHit || explodedBombs.length === 0) return;

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
          this.applyBotDamage(player.id, elapsedMs);

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

  private buildTickData(elapsedMs: number): domain.game.tick.TickData {
    const activePlayerIds = new Set<string>();
    const playerUpdates = this.collectChangedPlayerUpdates(activePlayerIds);
    this.cleanupInactivePlayerSnapshots(activePlayerIds);
    const hurricaneSync = this.hurricaneSystem.consumeSyncOutputs(elapsedMs);

    return {
      playerUpdates,
      cellUpdates: this.mapStore.getAndClearUpdates(),
      hurricaneSync: {
        ...hurricaneSync,
        // 消滅済みハリケーンを送信側スナップショットから落とすため生存IDを添える
        activeHurricaneIds: this.hurricaneSystem.getActiveHurricaneIds(),
      },
    };
  }

  /**
   * ハリケーン接触を検知し，被弾通知を配信する
   * 被弾クールダウンもBot硬直も単調増加の elapsedMs で判定する
   */
  private detectHurricaneHits(elapsedMs: number): void {
    const hitPlayerIds = this.hurricaneSystem.collectHitPlayerIds(
      this.players,
      elapsedMs,
    );

    hitPlayerIds.forEach((playerId) => {
      if (
        isBotPlayerId(playerId) ||
        this.disconnectedBotControlledPlayerIds.has(playerId)
      ) {
        this.applyBotDamage(playerId, elapsedMs);
      }

      this.callbacks.onHurricanePlayerHit?.(playerId);
    });
  }

  /**
   * Bot被弾時のスタン適用とカウント更新を行う
   * 爆弾・ハリケーンで処理内容が同一のため被弾元は受け取らない
   */
  private applyBotDamage(playerId: string, elapsedMs: number): void {
    const botPlayerId = playerId as BotPlayerId;
    const prevCount = this.botReceivedHitCountById.get(playerId) ?? 0;
    const nextCount = prevCount + 1;

    if (nextCount >= config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT) {
      this.botReceivedHitCountById.set(playerId, 0);
      this.botTurnOrchestrator.applyRespawnStun(botPlayerId, elapsedMs);
      return;
    }

    this.botReceivedHitCountById.set(playerId, nextCount);
    this.botTurnOrchestrator.applyHitStun(botPlayerId, elapsedMs);
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
        gridIndex: getPlayerGridIndex(player, this.mapSize),
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
    this.hurricaneSystem.clear();

    if (this.loopId) {
      clearTimeout(this.loopId);
      this.loopId = null;
    }

    logEvent(logScopes.GAME_LOOP, {
      event: gameDomainLogEvents.GAME_LOOP,
      result: logResults.STOPPED,
      roomId: this.roomId,
      elapsedMs: Math.round(this.gameClock.getElapsedMs()),
    });
  }
}
