/**
 * GameRoomSession
 * 1ルーム分のゲーム進行状態とゲームループ実行を管理する
 */
import { logEvent } from "@server/logging/logger";
import {
  gameDomainLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import {
  domain,
  type GameResultPayload,
  type PlaceBombPayload,
} from "@repo/shared";
import type {
  ActiveBombRegistration,
  ActiveBombSnapshot,
} from "../ports/gameUseCasePorts";
import { config } from "@server/config";
import { GameLoop, type GameLoopCallbacks } from "../../loop/GameLoop";
import { Player } from "../../entities/player/Player.js";
import { MapStore } from "../../entities/map/MapStore";
import { BombStateStore } from "../../entities/bomb/BombStateStore";
import {
  BOMB_COOLDOWN_TOLERANCE_MS,
} from "../../entities/bomb/bombCooldownGuard";
import { createSpawnedPlayer } from "../../entities/player/playerSpawn.js";
import {
  isValidPosition,
  setPlayerPosition,
} from "../../entities/player/playerMovement.js";
import { buildGameResultPayload } from "./gameResultCalculator.js";
import { TeamAssignmentService } from "../services/TeamAssignmentService.js";
import type { GameFieldConfig } from "../ports/gameUseCasePorts";

/** GameRoomSession のコールバック集合 */
export type GameSessionCallbacks = {
  onTick: (data: domain.game.tick.TickData) => void;
  onGameEnd: (payload: GameResultPayload) => void;
  onBotPlaceBomb?: (ownerId: string, payload: PlaceBombPayload) => void;
  onBotBombHit?: (targetPlayerId: string, bombId: string) => void;
  onHurricanePlayerHit?: (targetPlayerId: string) => void;
};

/** ルーム単位のゲーム状態とループ進行を保持するセッションクラス */
export class GameRoomSession {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private bombStateStore: BombStateStore;
  private gameLoop: GameLoop | null = null;
  private startTime: number | undefined;
  private startDelayTimer: NodeJS.Timeout | null = null;
  private fieldConfig: GameFieldConfig;

  constructor(
    private roomId: string,
    playerIds: string[],
    playerNamesById: Record<string, string>,
    fieldConfig: GameFieldConfig,
    teamPreferences?: Record<string, number | null>,
  ) {
    this.fieldConfig = fieldConfig;
    this.players = new Map();
    this.mapStore = new MapStore(this.getMapSize());
    this.bombStateStore = new BombStateStore();

    playerIds.forEach((playerId) => {
      // player_selectモードの希望チームIDがあればそれを使い，なければバランス割り当てする
      const preferredTeamId = teamPreferences?.[playerId] ?? null;
      const assignedTeamId = preferredTeamId !== null
        ? preferredTeamId
        : TeamAssignmentService.getBalancedTeamId(this.players);

      // 算出したチームIDを指定してプレイヤーを生成する
      const playerName = playerNamesById[playerId] ?? playerId;
      const player = createSpawnedPlayer(
        playerId,
        playerName,
        assignedTeamId,
        this.getMapSize(),
      );

      this.players.set(playerId, player);
    });
  }

  /** ルーム設定からマップサイズ（グリッド数）を取り出す */
  private getMapSize(): domain.game.player.MapBoundsSize {
    return {
      gridCols: this.fieldConfig.gridCols,
      gridRows: this.fieldConfig.gridRows,
    };
  }

  public start(tickRate: number, callbacks: GameSessionCallbacks): void {
    if (this.gameLoop) {
      return;
    }

    const gameStartDelayMs = (
      config.GAME_CONFIG as typeof config.GAME_CONFIG & {
        GAME_START_DELAY_MS?: number;
      }
    ).GAME_START_DELAY_MS;
    const startDelayMs = Math.max(0, gameStartDelayMs ?? 0);
    this.startTime = Date.now() + startDelayMs;

    const loopCallbacks: GameLoopCallbacks = {
      onTick: callbacks.onTick,
      onGameEnd: () => {
        const resultPayload = buildGameResultPayload(
          this.mapStore.getGridColorsView(),
          Array.from(this.players.values()),
        );
        this.dispose();
        callbacks.onGameEnd(resultPayload);
      },
      onBotPlaceBomb: callbacks.onBotPlaceBomb,
      onBotBombHit: callbacks.onBotBombHit,
      onHurricanePlayerHit: callbacks.onHurricanePlayerHit,
    };

    this.gameLoop = new GameLoop({
      roomId: this.roomId,
      tickRate,
      gridCols: this.fieldConfig.gridCols,
      gridRows: this.fieldConfig.gridRows,
      players: this.players,
      mapStore: this.mapStore,
      activeBombRegistry: this.bombStateStore.activeBombRegistry,
      callbacks: loopCallbacks,
    });

    // startDelayMs の待機中にJITとボット初期状態を準備する
    this.gameLoop.warmUp();

    if (startDelayMs === 0) {
      this.gameLoop.start();
      return;
    }

    this.startDelayTimer = setTimeout(() => {
      this.startDelayTimer = null;
      this.gameLoop?.start();
    }, startDelayMs);
  }

  public movePlayer(id: string, x: number, y: number): void {
    // 0 も有効なエポック時刻のため未設定判定は undefined のみで行う
    if (this.startTime !== undefined && Date.now() < this.startTime) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    const player = this.players.get(id);
    if (!player) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_PLAYER_NOT_FOUND,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    if (!isValidPosition(x, y)) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    setPlayerPosition({ player, x, y, mapSize: this.getMapSize() });
  }

  public removePlayer(id: string): boolean {
    this.gameLoop?.releaseBotControl(id);
    return this.players.delete(id);
  }

  /** 指定プレイヤーを切断後もBot制御で継続させる */
  public promotePlayerToBotControl(id: string): boolean {
    if (!this.players.has(id) || !this.gameLoop) {
      return false;
    }

    this.gameLoop.promotePlayerToBotControl(id);
    return true;
  }

  public getStartTime(): number | undefined {
    return this.startTime;
  }

  /** 現在セッションで確定したフィールド設定を返す */
  public getFieldConfig(): GameFieldConfig {
    return this.fieldConfig;
  }

  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  public shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    return this.bombStateStore.shouldBroadcastBombPlaced(dedupeKey, nowMs);
  }

  public shouldBroadcastBombHitReport(
    dedupeKey: string,
    nowMs: number,
  ): boolean {
    return this.bombStateStore.shouldBroadcastBombHitReport(dedupeKey, nowMs);
  }

  /**
   * 爆弾設置要求が開始済みかつクールダウンを満たすか判定し，受理時は直近受理時刻を更新する
   * クールダウンはクライアントと同じ共有ロジックでサーバー経過時間から解決する
   */
  public shouldAcceptBombPlacement(playerId: string, nowMs: number): boolean {
    // 移動と同じ基準で開始カウントダウン中の設置を拒否する
    // 0 も有効なエポック時刻のため未設定判定は undefined のみで行う
    if (this.startTime !== undefined && nowMs < this.startTime) {
      return false;
    }

    // 開始時刻未設定時は経過 0 として通常クールダウンで判定する
    const elapsedMs = this.resolveElapsedMs(nowMs);
    // フィーバー境界付近でクライアントが先に短縮判定しても弾かないよう許容誤差ぶん先読みする
    const cooldownMs = domain.game.bomb.resolveBombCooldownMs(
      elapsedMs + BOMB_COOLDOWN_TOLERANCE_MS,
    );
    return this.bombStateStore.shouldAcceptBombPlacement(
      playerId,
      nowMs,
      cooldownMs,
    );
  }

  // 開始時刻未設定時は経過 0 とみなしてゲーム開始からの経過時間を返す
  private resolveElapsedMs(nowMs: number): number {
    return this.startTime === undefined ? 0 : nowMs - this.startTime;
  }

  /**
   * サーバー経過時間を基準に爆発予定時刻を解決する
   * クライアント申告の爆発予定時刻は信頼せず，導火線時間をサーバー側で加算する
   * 開始待機中は経過を 0 に丸め，ゲームループの経過時間軸と揃える
   */
  public resolveBombExplodeAtElapsedMs(nowMs: number): number {
    const elapsedMs = Math.max(0, this.resolveElapsedMs(nowMs));
    return elapsedMs + config.GAME_CONFIG.BOMB_FUSE_MS;
  }

  public issueServerBombId(): string {
    return this.bombStateStore.issueServerBombId();
  }

  /** 指定プレイヤーのチームIDを返す，存在しない場合は UNKNOWN_TEAM_ID を返す */
  public getPlayerTeamId(playerId: string): number {
    const player = this.players.get(playerId);
    return player?.teamId ?? -1;
  }

  /** 設置済み爆弾をアクティブレジストリに登録する */
  public registerActiveBomb(registration: ActiveBombRegistration): void {
    const player = this.players.get(registration.ownerPlayerId);
    const ownerTeamId = player?.teamId ?? -1;
    this.bombStateStore.activeBombRegistry.registerBomb({
      bombId: registration.bombId,
      ownerPlayerId: registration.ownerPlayerId,
      x: registration.x,
      y: registration.y,
      explodeAtElapsedMs: registration.explodeAtElapsedMs,
      ownerTeamId,
    });
    this.bombStateStore.registerBombOwner(
      registration.bombId,
      registration.ownerPlayerId,
    );
  }

  /**
   * 被弾報告が爆弾設置者と同チーム（設置者本人・味方）からのものか判定する
   * 同チーム判定は shared の checkBombHit と同じ規則（未確定 teamId は同チーム扱いしない）
   * 設置者が引けない爆弾は判定できないため同チーム扱いしない
   */
  public isSameTeamBombHitReport(
    reporterPlayerId: string,
    bombId: string,
  ): boolean {
    const ownerPlayerId = this.bombStateStore.getBombOwnerPlayerId(bombId);
    if (!ownerPlayerId) return false;
    const ownerTeamId = this.getPlayerTeamId(ownerPlayerId);
    const reporterTeamId = this.getPlayerTeamId(reporterPlayerId);
    return (
      ownerTeamId === reporterTeamId && !config.isUnknownTeamId(ownerTeamId)
    );
  }

  /** 指定爆弾の所有者の bombHitCount を加算する */
  public recordBombHitForOwner(bombId: string): void {
    const ownerPlayerId = this.bombStateStore.getBombOwnerPlayerId(bombId);
    if (!ownerPlayerId) return;
    const owner = this.players.get(ownerPlayerId);
    if (owner) {
      owner.bombHitCount += 1;
    }
  }

  /** 現在アクティブな爆弾一覧を返す */
  public getActiveBombSnapshots(): ActiveBombSnapshot[] {
    return this.bombStateStore.activeBombRegistry.getActiveBombSnapshots().map((bomb) => {
      return {
        bombId: bomb.bombId,
        ownerPlayerId: bomb.ownerPlayerId,
        ownerTeamId: bomb.ownerTeamId,
        x: bomb.x,
        y: bomb.y,
        explodeAtElapsedMs: bomb.explodeAtElapsedMs,
      };
    });
  }

  public dispose(): void {
    if (this.startDelayTimer) {
      clearTimeout(this.startDelayTimer);
      this.startDelayTimer = null;
    }

    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }
    this.players.clear();
  }
}
