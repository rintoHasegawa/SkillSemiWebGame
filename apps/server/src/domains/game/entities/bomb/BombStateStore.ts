/**
 * BombStateStore
 * セッション単位の爆弾重複排除状態と採番状態を管理する
 */
import { issueServerBombId } from "./bombIdentity.js";
import { shouldBroadcastBombPlaced } from "./bombDedup.js";

/** セッション単位の爆弾重複排除状態と採番状態を保持するストア */
export class BombStateStore {
  private bombDedupTable = new Map<string, number>();
  private bombSerial = 0;

  /** 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
  public shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    return shouldBroadcastBombPlaced({
      dedupTable: this.bombDedupTable,
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
}
