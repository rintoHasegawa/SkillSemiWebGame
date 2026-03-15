/**
 * realtimeRoomSyncState
 * ルーム単位で高頻度同期の前回送信状態を保持するストアを提供する
 */
import type { domain } from "@repo/shared";

type RoomId = domain.room.Room["roomId"];

/** ルーム単位のプレイヤー送信座標キャッシュの構造 */
export type RoomPlayerPositionCache = Map<string, { x: number; y: number }>;

/** 高頻度同期向けのルーム状態ストア操作契約 */
export type RealtimeRoomSyncStateStore = {
  getPlayerPositionCache: (roomId: RoomId) => RoomPlayerPositionCache;
  resetRoom: (roomId: RoomId) => void;
};

/** 高頻度同期向けのルーム状態ストアを生成する */
export const createRealtimeRoomSyncStateStore = (): RealtimeRoomSyncStateStore => {
  const playerPositionCacheByRoomId = new Map<RoomId, RoomPlayerPositionCache>();

  return {
    getPlayerPositionCache: (roomId) => {
      const existing = playerPositionCacheByRoomId.get(roomId);
      if (existing) {
        return existing;
      }

      const created: RoomPlayerPositionCache = new Map();
      playerPositionCacheByRoomId.set(roomId, created);
      return created;
    },
    resetRoom: (roomId) => {
      playerPositionCacheByRoomId.delete(roomId);
    },
  };
};
