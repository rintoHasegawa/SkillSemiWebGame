/**
 * BombStateStore
 * セッション単位の爆弾重複排除状態と採番状態を管理する
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
 * 爆発後も設置者参照を保持する猶予時間（ms）
 * 爆発直後に届く被弾報告のスタッツ加算を取りこぼさないよう，
 * 重複排除の追加TTLと同じ猶予を置いてから解放する
 */
const BOMB_OWNER_RETENTION_MS = config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;

/** セッション単位の爆弾重複排除状態と採番状態を保持するストア */
export class BombStateStore {
  private bombDedupTable = new Map<string, number>();
  private bombHitReportDedupTable = new Map<string, number>();
  private bombSerial = 0;

  /** プレイヤーごとの直近の爆弾設置受理時刻（ゲーム経過ms） */
  private lastBombAcceptedAtElapsedMsByPlayerId = new Map<string, number>();

  /**
   * アクティブ爆弾のライフサイクルを追跡するレジストリ
   * 爆発済み爆弾の回収に合わせて設置者参照の解放も予約する
   */
  public readonly activeBombRegistry = new ActiveBombRegistry({
    onBombsCollected: (explodedBombs, elapsedMs) => {
      this.releaseCollectedBombOwners(explodedBombs, elapsedMs);
    },
  });

  /** 爆弾IDから設置者プレイヤーIDを引くためのマップ（爆発後も猶予付きで保持する） */
  private bombOwnerMap = new Map<string, string>();

  /** 爆弾IDごとの設置者参照の解放予定時刻（セッション経過ms） */
  private bombOwnerReleaseAtElapsedMs = new Map<string, number>();

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

  /** 爆弾IDと設置者プレイヤーIDを紐づけて記録する */
  public registerBombOwner(bombId: string, ownerPlayerId: string): void {
    this.bombOwnerMap.set(bombId, ownerPlayerId);
  }

  /** 爆弾IDから設置者プレイヤーIDを取得する */
  public getBombOwnerPlayerId(bombId: string): string | undefined {
    return this.bombOwnerMap.get(bombId);
  }

  /**
   * 回収した爆弾の設置者参照へ解放を予約し，猶予切れの参照を削除する
   * 回収と同時に消すと直後に届く被弾報告のスタッツ加算を取りこぼすため猶予を置く
   */
  private releaseCollectedBombOwners(
    explodedBombs: ActiveBomb[],
    elapsedMs: number,
  ): void {
    // 非有限の経過時間では解放予定時刻を決められないため何もしない
    if (!Number.isFinite(elapsedMs)) {
      return;
    }

    this.scheduleBombOwnerRelease(explodedBombs, elapsedMs);
    this.releaseExpiredBombOwners(elapsedMs);
  }

  // 回収した爆弾の設置者参照へ解放予定時刻を設定する
  private scheduleBombOwnerRelease(
    explodedBombs: ActiveBomb[],
    elapsedMs: number,
  ): void {
    explodedBombs.forEach((bomb) => {
      if (!this.bombOwnerMap.has(bomb.bombId)) {
        return;
      }

      this.bombOwnerReleaseAtElapsedMs.set(
        bomb.bombId,
        elapsedMs + BOMB_OWNER_RETENTION_MS,
      );
    });
  }

  // 解放予定時刻に達した設置者参照を削除する
  private releaseExpiredBombOwners(elapsedMs: number): void {
    this.bombOwnerReleaseAtElapsedMs.forEach((releaseAtElapsedMs, bombId) => {
      const isWithinRetention =
        Number.isFinite(releaseAtElapsedMs) && releaseAtElapsedMs > elapsedMs;
      if (isWithinRetention) {
        return;
      }

      this.bombOwnerMap.delete(bombId);
      this.bombOwnerReleaseAtElapsedMs.delete(bombId);
    });
  }
}
