/**
 * BombStateStore
 * セッション単位の爆弾重複排除状態と採番状態を管理する
 * 被弾報告の検証に使う爆弾レコードを爆発後も猶予付きで保持する
 */
import { config } from "@repo/shared";
import { issueServerBombId } from "./bombIdentity.js";
import { shouldAcceptBombPlacement } from "./bombCooldownGuard.js";
import {
  shouldBroadcastBombHitReport,
  shouldBroadcastBombPlaced,
} from "./bombDedup.js";
import { ActiveBombRegistry, type ActiveBomb } from "./ActiveBombRegistry.js";

/**
 * 爆発後も被弾報告の検証に利用する爆弾レコード
 * 設置者に加えて座標と爆発予定時刻を保持し，実在・時刻窓・距離の検証へ用いる
 */
export type RetainedBombRecord = {
  ownerPlayerId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/**
 * 爆発後も爆弾レコードを保持する猶予時間（ms）
 * 爆発直後に届く被弾報告の受理とスタッツ加算を取りこぼさないよう，
 * 被弾報告の受理猶予と同じ時間を置いてから解放する
 */
const BOMB_RECORD_RETENTION_MS =
  config.GAME_CONFIG.BOMB_HIT_REPORT_RETENTION_MS;

/** セッション単位の爆弾重複排除状態と採番状態を保持するストア */
export class BombStateStore {
  private bombDedupTable = new Map<string, number>();
  private bombHitReportDedupTable = new Map<string, number>();
  private bombSerial = 0;

  /** プレイヤーごとの直近の爆弾設置受理時刻（ゲーム経過ms） */
  private lastBombAcceptedAtElapsedMsByPlayerId = new Map<string, number>();

  /**
   * アクティブ爆弾のライフサイクルを追跡するレジストリ
   * 爆発済み爆弾の回収に合わせて爆弾レコードの解放も予約する
   */
  public readonly activeBombRegistry = new ActiveBombRegistry({
    onBombsCollected: (explodedBombs, elapsedMs) => {
      this.releaseCollectedBombRecords(explodedBombs, elapsedMs);
    },
  });

  /**
   * 爆弾IDから被弾報告検証用のレコードを引くマップ（爆発後も猶予付きで保持する）
   * アクティブ爆弾レジストリとは別テーブルとし，爆発済み爆弾がAOI同期の
   * アクティブ爆弾として配信されないようにする
   */
  private retainedBombRecords = new Map<string, RetainedBombRecord>();

  /** 爆弾IDごとのレコード解放予定時刻（セッション経過ms） */
  private bombRecordReleaseAtElapsedMs = new Map<string, number>();

  /** 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
  public shouldBroadcastBombPlaced(
    dedupeKey: string,
    elapsedMs: number,
  ): boolean {
    return shouldBroadcastBombPlaced({
      dedupTable: this.bombDedupTable,
      dedupeKey,
      nowMs: elapsedMs,
    });
  }

  /** 爆弾設置要求がクールダウンを満たすか判定し，受理時は直近受理時刻を更新する */
  public shouldAcceptBombPlacement(
    playerId: string,
    elapsedMs: number,
    cooldownMs: number,
  ): boolean {
    return shouldAcceptBombPlacement({
      lastAcceptedAtMsByPlayerId: this.lastBombAcceptedAtElapsedMsByPlayerId,
      playerId,
      nowMs: elapsedMs,
      cooldownMs,
    });
  }

  /** 被弾報告イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
  public shouldBroadcastBombHitReport(
    dedupeKey: string,
    elapsedMs: number,
  ): boolean {
    return shouldBroadcastBombHitReport({
      dedupTable: this.bombHitReportDedupTable,
      dedupeKey,
      nowMs: elapsedMs,
    });
  }

  /** セッション単位の連番からサーバー採番の爆弾IDを生成する */
  public issueServerBombId(): string {
    const { bombId, nextSerial } = issueServerBombId({
      currentSerial: this.bombSerial,
    });
    this.bombSerial = nextSerial;
    return bombId;
  }

  /** 爆弾IDと被弾報告検証用のレコードを紐づけて記録する */
  public registerBombRecord(bombId: string, record: RetainedBombRecord): void {
    this.retainedBombRecords.set(bombId, record);
  }

  /** 爆弾IDから被弾報告検証用のレコードを取得する */
  public getRetainedBombRecord(
    bombId: string,
  ): RetainedBombRecord | undefined {
    return this.retainedBombRecords.get(bombId);
  }

  /** 爆弾IDから設置者プレイヤーIDを取得する */
  public getBombOwnerPlayerId(bombId: string): string | undefined {
    return this.retainedBombRecords.get(bombId)?.ownerPlayerId;
  }

  /**
   * 回収した爆弾のレコードへ解放を予約し，猶予切れのレコードを削除する
   * 回収と同時に消すと直後に届く被弾報告を取りこぼすため猶予を置く
   */
  private releaseCollectedBombRecords(
    explodedBombs: ActiveBomb[],
    elapsedMs: number,
  ): void {
    // 非有限の経過時間では解放予定時刻を決められないため何もしない
    if (!Number.isFinite(elapsedMs)) {
      return;
    }

    this.scheduleBombRecordRelease(explodedBombs, elapsedMs);
    this.releaseExpiredBombRecords(elapsedMs);
  }

  // 回収した爆弾のレコードへ解放予定時刻を設定する
  private scheduleBombRecordRelease(
    explodedBombs: ActiveBomb[],
    elapsedMs: number,
  ): void {
    explodedBombs.forEach((bomb) => {
      if (!this.retainedBombRecords.has(bomb.bombId)) {
        return;
      }

      this.bombRecordReleaseAtElapsedMs.set(
        bomb.bombId,
        elapsedMs + BOMB_RECORD_RETENTION_MS,
      );
    });
  }

  // 解放予定時刻に達したレコードを削除する
  private releaseExpiredBombRecords(elapsedMs: number): void {
    this.bombRecordReleaseAtElapsedMs.forEach((releaseAtElapsedMs, bombId) => {
      const isWithinRetention =
        Number.isFinite(releaseAtElapsedMs) && releaseAtElapsedMs > elapsedMs;
      if (isWithinRetention) {
        return;
      }

      this.retainedBombRecords.delete(bombId);
      this.bombRecordReleaseAtElapsedMs.delete(bombId);
    });
  }
}
