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
  BombHitReportOriginDecision,
} from "../ports/gameUseCasePorts";
import { config } from "@server/config";
import { GameLoop, type GameLoopCallbacks } from "../../loop/GameLoop";
import { GameClock, type NowProvider } from "../../loop/GameClock";
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
  /** サーバー側ゲーム時間の唯一の基準，GameLoop と共有する */
  private readonly gameClock: GameClock;
  private fieldConfig: GameFieldConfig;

  constructor(
    private roomId: string,
    playerIds: string[],
    playerNamesById: Record<string, string>,
    fieldConfig: GameFieldConfig,
    teamPreferences?: Record<string, number | null>,
    // 単調時計を差し替え可能にし，セッション経由の時間判定をスタブで検証できるようにする
    nowProvider?: NowProvider,
  ) {
    this.fieldConfig = fieldConfig;
    // 開始待機時間は GameClock だけが保持し，ループ側もそこから読む
    this.gameClock = new GameClock(
      config.GAME_CONFIG.GAME_START_DELAY_MS,
      nowProvider,
    );
    this.players = new Map();
    this.mapStore = new MapStore(this.getMapSize());
    this.bombStateStore = new BombStateStore();

    // 生成順が走査順に依存しないよう，希望チーム確定分を先に積んでから均等割り当てする
    const createdPlayers = new Map<string, Player>();
    const createPlayerWithTeam = (playerId: string, teamId: number): void => {
      const playerName = playerNamesById[playerId] ?? playerId;
      createdPlayers.set(
        playerId,
        createSpawnedPlayer(playerId, playerName, teamId, this.getMapSize()),
      );
    };

    // 第1パス: player_selectモードの希望チームIDを持つプレイヤーを先に確定させる
    const balancedTargetIds: string[] = [];
    playerIds.forEach((playerId) => {
      const preferredTeamId = teamPreferences?.[playerId] ?? null;
      if (preferredTeamId !== null) {
        createPlayerWithTeam(playerId, preferredTeamId);
        return;
      }
      balancedTargetIds.push(playerId);
    });

    // 第2パス: 希望なしのプレイヤーを希望者込みの人数で均等割り当てする
    balancedTargetIds.forEach((playerId) => {
      createPlayerWithTeam(
        playerId,
        TeamAssignmentService.getBalancedTeamId(createdPlayers),
      );
    });

    // 登録順は参加順（playerIdsの並び）を維持する
    playerIds.forEach((playerId) => {
      const player = createdPlayers.get(playerId);
      if (player) {
        this.players.set(playerId, player);
      }
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
      gameClock: this.gameClock,
      callbacks: loopCallbacks,
    });

    // 開始待機の待ち時間中にJITとボット初期状態を準備する
    this.gameLoop.warmUp();

    // 開始待機時間は GameClock 側の値が使われるため引数では渡さない
    this.gameLoop.start();
  }

  public movePlayer(id: string, x: number, y: number): void {
    // 開始カウントダウン中の入力はゲーム時間軸を基準に拒否する
    if (!this.gameClock.hasGameplayStarted()) {
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

  /**
   * クライアントへ配信する符号付きゲーム経過msを返す
   * カウントダウン中は負値になり，壁時計を介さずに時計同期できる
   */
  public getSignedElapsedMs(): number {
    return this.gameClock.getSignedElapsedMs();
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

  public shouldBroadcastBombPlaced(dedupeKey: string): boolean {
    return this.bombStateStore.shouldBroadcastBombPlaced(
      dedupeKey,
      this.gameClock.getElapsedMs(),
    );
  }

  public shouldBroadcastBombHitReport(dedupeKey: string): boolean {
    return this.bombStateStore.shouldBroadcastBombHitReport(
      dedupeKey,
      this.gameClock.getElapsedMs(),
    );
  }

  /**
   * 爆弾設置要求が開始済みかつクールダウンを満たすか判定し，受理時は直近受理時刻を更新する
   * クールダウンはクライアントと同じ共有ロジックでサーバー経過時間から解決する
   */
  public shouldAcceptBombPlacement(playerId: string): boolean {
    // 移動と同じ基準で開始カウントダウン中の設置を拒否する
    if (!this.gameClock.hasGameplayStarted()) {
      return false;
    }

    const elapsedMs = this.gameClock.getElapsedMs();
    // フィーバー境界付近でクライアントが先に短縮判定しても弾かないよう許容誤差ぶん先読みする
    const cooldownMs = domain.game.bomb.resolveBombCooldownMs(
      elapsedMs + BOMB_COOLDOWN_TOLERANCE_MS,
    );
    return this.bombStateStore.shouldAcceptBombPlacement(
      playerId,
      elapsedMs,
      cooldownMs,
    );
  }

  /**
   * サーバー経過時間を基準に爆発予定時刻を解決する
   * クライアント申告の爆発予定時刻は信頼せず，導火線時間をサーバー側で加算する
   * 経過時間はゲームループと同一の GameClock から取るため回収判定と軸が揃う
   */
  public resolveBombExplodeAtElapsedMs(): number {
    return this.gameClock.getElapsedMs() + config.GAME_CONFIG.BOMB_FUSE_MS;
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
    // 被弾報告の検証に使うレコードは爆発後も猶予付きで別テーブルに保持する
    this.bombStateStore.registerBombRecord(registration.bombId, {
      ownerPlayerId: registration.ownerPlayerId,
      x: registration.x,
      y: registration.y,
      explodeAtElapsedMs: registration.explodeAtElapsedMs,
    });
  }

  /**
   * 被弾報告の爆弾が実在し，受理時刻窓と距離しきい値の内側か判定する
   * 受理時刻窓は「登録済み」かつ「爆発予定時刻＋受理猶予まで」とし，設置から
   * 爆発前の報告も受理する（時計同期誤差で正規報告が爆発時刻より早く届き得るため）
   * 判定に必要な値が欠けている場合は正規プレイヤーの報告を落とさないよう受理側へ倒す
   */
  public checkBombHitReportOrigin(
    reporterPlayerId: string,
    bombId: string,
  ): BombHitReportOriginDecision {
    const record = this.bombStateStore.getRetainedBombRecord(bombId);
    if (!record) {
      return { status: "unknown_bomb" };
    }

    const elapsedMs = this.gameClock.getElapsedMs();
    const acceptUntilElapsedMs =
      record.explodeAtElapsedMs
      + config.GAME_CONFIG.BOMB_HIT_REPORT_RETENTION_MS;
    // 非有限の時刻では窓を判定できないため時刻検証を行わない
    const isTimeComparable =
      Number.isFinite(elapsedMs) && Number.isFinite(acceptUntilElapsedMs);
    if (isTimeComparable && elapsedMs > acceptUntilElapsedMs) {
      return { status: "expired" };
    }

    // 報告者のサーバー既知座標が引けない場合は距離を判定できないため受理する
    const reporter = this.players.get(reporterPlayerId);
    if (!reporter) {
      return { status: "valid" };
    }

    const isWithinRange = domain.game.bombHit.isWithinBombHitReportRange({
      bomb: { x: record.x, y: record.y },
      reporter: { x: reporter.x, y: reporter.y },
    });
    return isWithinRange ? { status: "valid" } : { status: "too_far" };
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
    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }
    this.players.clear();
  }
}
