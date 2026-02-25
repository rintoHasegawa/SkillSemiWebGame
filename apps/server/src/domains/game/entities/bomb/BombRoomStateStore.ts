/**
 * BombRoomStateStore
 * ルーム単位の爆弾重複排除状態と採番状態を管理する
 */
import { config } from "@repo/shared";

/** ルーム単位の爆弾重複排除状態と採番状態を保持するストア */
export class BombRoomStateStore {
  private bombDedupTable = new Map<string, number>();
  private bombSerial = 0;

  /** 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
  public shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    this.cleanupExpiredBombDedup(nowMs);

    if (this.bombDedupTable.has(dedupeKey)) {
      return false;
    }

    const ttlMs = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;
    this.bombDedupTable.set(dedupeKey, nowMs + ttlMs);
    return true;
  }

  /** セッション単位の連番からサーバー採番の爆弾IDを生成する */
  public issueServerBombId(roomId: string): string {
    this.bombSerial += 1;
    return `${roomId}:${this.bombSerial}`;
  }

  private cleanupExpiredBombDedup(nowMs: number): void {
    this.bombDedupTable.forEach((expiresAtMs, dedupeKey) => {
      if (expiresAtMs <= nowMs) {
        this.bombDedupTable.delete(dedupeKey);
      }
    });
  }
}
