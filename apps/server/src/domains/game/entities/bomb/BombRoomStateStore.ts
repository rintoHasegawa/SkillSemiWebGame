/**
 * BombRoomStateStore
 * ルーム単位の爆弾重複排除状態と採番状態を管理する
 */
import { issueServerBombId } from "./bombIdentity.js";
import { shouldBroadcastBombPlaced } from "./bombDedup.js";

/** ルーム単位の爆弾重複排除状態と採番状態を保持するストア */
export class BombRoomStateStore {
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
  public issueServerBombId(roomId: string): string {
    const { bombId, nextSerial } = issueServerBombId({
      roomId,
      currentSerial: this.bombSerial,
    });
    this.bombSerial = nextSerial;
    return bombId;
  }
}
