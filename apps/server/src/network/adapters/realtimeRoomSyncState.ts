/**
 * realtimeRoomSyncState
 * ルーム単位で高頻度同期の前回送信状態を保持するストアを提供する
 */
import type { domain } from "@repo/shared";

type RoomId = domain.room.Room["roomId"];
type SocketId = string;

/** ソケットごとのAOI中心セル座標 */
export type SocketAoiCell = {
  col: number;
  row: number;
};

/** ルーム単位のプレイヤー送信座標キャッシュの構造 */
export type RoomPlayerPositionCache = Map<string, { x: number; y: number }>;

/** ルーム単位のソケット別プレイヤー送信座標キャッシュの構造 */
type RoomPlayerPositionCacheBySocketId = Map<SocketId, RoomPlayerPositionCache>;

/** ルーム単位のソケット別AOI中心セルキャッシュの構造 */
type RoomAoiCellCache = Map<SocketId, SocketAoiCell>;

/** ルーム単位のソケット別可視IDキャッシュの構造 */
type RoomVisibleIdsCache = Map<SocketId, Set<string>>;

/** 高頻度同期向けのルーム状態ストア操作契約 */
export type RealtimeRoomSyncStateStore = {
  getPlayerPositionCache: (
    roomId: RoomId,
    socketId: SocketId,
  ) => RoomPlayerPositionCache;
  getLastAoiCell: (roomId: RoomId, socketId: SocketId) => SocketAoiCell | undefined;
  setLastAoiCell: (roomId: RoomId, socketId: SocketId, cell: SocketAoiCell) => void;
  getVisiblePlayerIdsSnapshot: (roomId: RoomId, socketId: SocketId) => Set<string>;
  getVisibleBombIdsSnapshot: (roomId: RoomId, socketId: SocketId) => Set<string>;
  getVisibleHurricaneIdsSnapshot: (roomId: RoomId, socketId: SocketId) => Set<string>;
  replaceVisiblePlayerIds: (
    roomId: RoomId,
    socketId: SocketId,
    nextIds: Iterable<string>,
  ) => void;
  replaceVisibleBombIds: (
    roomId: RoomId,
    socketId: SocketId,
    nextIds: Iterable<string>,
  ) => void;
  replaceVisibleHurricaneIds: (
    roomId: RoomId,
    socketId: SocketId,
    nextIds: Iterable<string>,
  ) => void;
  resetRoom: (roomId: RoomId) => void;
};

/** 高頻度同期向けのルーム状態ストアを生成する */
export const createRealtimeRoomSyncStateStore = (): RealtimeRoomSyncStateStore => {
  const playerPositionCacheByRoomId = new Map<
    RoomId,
    RoomPlayerPositionCacheBySocketId
  >();
  const aoiCellCacheByRoomId = new Map<RoomId, RoomAoiCellCache>();
  const visiblePlayerIdsByRoomId = new Map<RoomId, RoomVisibleIdsCache>();
  const visibleBombIdsByRoomId = new Map<RoomId, RoomVisibleIdsCache>();
  const visibleHurricaneIdsByRoomId = new Map<RoomId, RoomVisibleIdsCache>();

  const getOrCreateSocketScopedCache = <T>(
    roomCache: Map<RoomId, Map<SocketId, T>>,
    roomId: RoomId,
    socketId: SocketId,
    createValue: () => T,
  ): T => {
    const bySocketId = roomCache.get(roomId) ?? new Map<SocketId, T>();
    roomCache.set(roomId, bySocketId);

    const existing = bySocketId.get(socketId);
    if (existing) {
      return existing;
    }

    const created = createValue();
    bySocketId.set(socketId, created);
    return created;
  };

  return {
    getPlayerPositionCache: (roomId, socketId) => {
      return getOrCreateSocketScopedCache(
        playerPositionCacheByRoomId,
        roomId,
        socketId,
        () => new Map<string, { x: number; y: number }>(),
      );
    },
    getLastAoiCell: (roomId, socketId) => {
      return aoiCellCacheByRoomId.get(roomId)?.get(socketId);
    },
    setLastAoiCell: (roomId, socketId, cell) => {
      const aoiCellCache = aoiCellCacheByRoomId.get(roomId) ?? new Map();
      aoiCellCache.set(socketId, cell);
      aoiCellCacheByRoomId.set(roomId, aoiCellCache);
    },
    getVisiblePlayerIdsSnapshot: (roomId, socketId) => {
      const cache = getOrCreateSocketScopedCache(
        visiblePlayerIdsByRoomId,
        roomId,
        socketId,
        () => new Set<string>(),
      );
      return new Set(cache);
    },
    getVisibleBombIdsSnapshot: (roomId, socketId) => {
      const cache = getOrCreateSocketScopedCache(
        visibleBombIdsByRoomId,
        roomId,
        socketId,
        () => new Set<string>(),
      );
      return new Set(cache);
    },
    getVisibleHurricaneIdsSnapshot: (roomId, socketId) => {
      const cache = getOrCreateSocketScopedCache(
        visibleHurricaneIdsByRoomId,
        roomId,
        socketId,
        () => new Set<string>(),
      );
      return new Set(cache);
    },
    replaceVisiblePlayerIds: (roomId, socketId, nextIds) => {
      const cache = getOrCreateSocketScopedCache(
        visiblePlayerIdsByRoomId,
        roomId,
        socketId,
        () => new Set<string>(),
      );
      cache.clear();
      for (const nextId of nextIds) {
        cache.add(nextId);
      }
    },
    replaceVisibleBombIds: (roomId, socketId, nextIds) => {
      const cache = getOrCreateSocketScopedCache(
        visibleBombIdsByRoomId,
        roomId,
        socketId,
        () => new Set<string>(),
      );
      cache.clear();
      for (const nextId of nextIds) {
        cache.add(nextId);
      }
    },
    replaceVisibleHurricaneIds: (roomId, socketId, nextIds) => {
      const cache = getOrCreateSocketScopedCache(
        visibleHurricaneIdsByRoomId,
        roomId,
        socketId,
        () => new Set<string>(),
      );
      cache.clear();
      for (const nextId of nextIds) {
        cache.add(nextId);
      }
    },
    resetRoom: (roomId) => {
      playerPositionCacheByRoomId.delete(roomId);
      aoiCellCacheByRoomId.delete(roomId);
      visiblePlayerIdsByRoomId.delete(roomId);
      visibleBombIdsByRoomId.delete(roomId);
      visibleHurricaneIdsByRoomId.delete(roomId);
    },
  };
};
