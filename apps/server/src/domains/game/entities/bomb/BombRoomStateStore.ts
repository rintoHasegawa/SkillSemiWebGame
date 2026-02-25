/**
 * BombRoomStateStore
 * ルーム単位の爆弾重複排除状態と採番状態を管理する
 */
import { config } from "@repo/shared";

/** 爆弾状態破棄理由の識別子 */
export type BombRoomStateClearReason = "game-ended" | "room-deleted";

/** ルーム単位の爆弾重複排除状態と採番状態を保持するストア */
export class BombRoomStateStore {
  private roomBombDedupTable = new Map<string, Map<string, number>>();
  private roomBombSerialTable = new Map<string, number>();
  private isBombRoomStateDebugEnabled = process.env.NODE_ENV !== "production";

  /** 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
  public shouldBroadcastBombPlaced(roomId: string, dedupeKey: string, nowMs: number): boolean {
    this.cleanupExpiredBombDedup(roomId, nowMs);

    const roomTable = this.roomBombDedupTable.get(roomId) ?? new Map<string, number>();
    if (roomTable.has(dedupeKey)) {
      return false;
    }

    const ttlMs = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;
    roomTable.set(dedupeKey, nowMs + ttlMs);
    this.roomBombDedupTable.set(roomId, roomTable);
    return true;
  }

  /** ルーム単位の連番からサーバー採番の爆弾IDを生成する */
  public issueServerBombId(roomId: string): string {
    const serial = (this.roomBombSerialTable.get(roomId) ?? 0) + 1;
    this.roomBombSerialTable.set(roomId, serial);
    return `${roomId}:${serial}`;
  }

  /** 指定ルームの爆弾採番状態と重複排除状態を破棄する */
  public clearBombRoomState(roomId: string, reason: BombRoomStateClearReason): void {
    const hadDedupState = this.roomBombDedupTable.delete(roomId);
    const hadSerialState = this.roomBombSerialTable.delete(roomId);

    if (!this.isBombRoomStateDebugEnabled) {
      return;
    }

    console.debug(
      `[BombState] cleared room=${roomId} reason=${reason} dedup=${hadDedupState} serial=${hadSerialState}`
    );
  }

  private cleanupExpiredBombDedup(roomId: string, nowMs: number): void {
    const roomTable = this.roomBombDedupTable.get(roomId);
    if (!roomTable) {
      return;
    }

    roomTable.forEach((expiresAtMs, dedupeKey) => {
      if (expiresAtMs <= nowMs) {
        roomTable.delete(dedupeKey);
      }
    });

    if (roomTable.size === 0) {
      this.roomBombDedupTable.delete(roomId);
    }
  }
}
