/**
 * BombStateStore
 * セッション単位の爆弾重複排除状態と採番状態を管理する
 */
import { issueServerBombId } from "./bombIdentity.js";
import {
  shouldBroadcastBombHitReport,
  shouldBroadcastBombPlaced,
} from "./bombDedup.js";
import { ActiveBombRegistry } from "./ActiveBombRegistry.js";

/** セッション単位の爆弾重複排除状態と採番状態を保持するストア */
export class BombStateStore {
  private bombDedupTable = new Map<string, number>();
  private bombHitReportDedupTable = new Map<string, number>();
  private bombSerial = 0;

  /** アクティブ爆弾のライフサイクルを追跡するレジストリ */
  public readonly activeBombRegistry = new ActiveBombRegistry();

  /** 爆弾IDから設置者プレイヤーIDを引くためのマップ（爆発後も保持する） */
  private bombOwnerMap = new Map<string, string>();

  /** 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
  public shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    return shouldBroadcastBombPlaced({
      dedupTable: this.bombDedupTable,
      dedupeKey,
      nowMs,
    });
  }

  /** 被弾報告イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
  public shouldBroadcastBombHitReport(dedupeKey: string, nowMs: number): boolean {
    return shouldBroadcastBombHitReport({
      dedupTable: this.bombHitReportDedupTable,
      dedupeKey,
      nowMs,
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
}
