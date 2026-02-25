/**
 * BombRoomStateStore
 * ルーム単位の爆弾重複排除状態と採番状態を管理する
 */
import { config } from "@repo/shared";

type BombRoomStateClearReason = "game-ended" | "room-deleted";

const roomBombDedupTable = new Map<string, Map<string, number>>();
const roomBombSerialTable = new Map<string, number>();
const isBombRoomStateDebugEnabled = process.env.NODE_ENV !== "production";

const cleanupExpiredBombDedup = (roomId: string, nowMs: number) => {
  const roomTable = roomBombDedupTable.get(roomId);
  if (!roomTable) return;

  roomTable.forEach((expiresAtMs, dedupeKey) => {
    if (expiresAtMs <= nowMs) {
      roomTable.delete(dedupeKey);
    }
  });

  if (roomTable.size === 0) {
    roomBombDedupTable.delete(roomId);
  }
};

/** 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する */
export const shouldBroadcastBombPlaced = (roomId: string, dedupeKey: string, nowMs: number): boolean => {
  cleanupExpiredBombDedup(roomId, nowMs);

  const roomTable = roomBombDedupTable.get(roomId) ?? new Map<string, number>();
  if (roomTable.has(dedupeKey)) {
    return false;
  }

  const ttlMs = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;
  roomTable.set(dedupeKey, nowMs + ttlMs);
  roomBombDedupTable.set(roomId, roomTable);
  return true;
};

/** ルーム単位の連番からサーバー採番の爆弾IDを生成する */
export const issueServerBombId = (roomId: string): string => {
  const serial = (roomBombSerialTable.get(roomId) ?? 0) + 1;
  roomBombSerialTable.set(roomId, serial);
  return `${roomId}:${serial}`;
};

/** 指定ルームの爆弾採番状態と重複排除状態を破棄する */
export const clearBombRoomState = (roomId: string, reason: BombRoomStateClearReason): void => {
  const hadDedupState = roomBombDedupTable.delete(roomId);
  const hadSerialState = roomBombSerialTable.delete(roomId);

  if (!isBombRoomStateDebugEnabled) {
    return;
  }

  console.debug(
    `[BombState] cleared room=${roomId} reason=${reason} dedup=${hadDedupState} serial=${hadSerialState}`
  );
};
