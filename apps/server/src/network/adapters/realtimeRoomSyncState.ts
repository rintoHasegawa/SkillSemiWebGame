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
  /** 切断ソケットのキャッシュを全ルームから解放する */
  releaseSocket: (socketId: SocketId) => void;
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

  // 可視IDキャッシュ1種分の参照・更新操作をまとめて生成する
  const createVisibleIdsAccessors = (
    roomCache: Map<RoomId, RoomVisibleIdsCache>,
  ) => {
    const getOrCreate = (roomId: RoomId, socketId: SocketId): Set<string> => {
      return getOrCreateSocketScopedCache(
        roomCache,
        roomId,
        socketId,
        () => new Set<string>(),
      );
    };

    return {
      getSnapshot: (roomId: RoomId, socketId: SocketId): Set<string> => {
        return new Set(getOrCreate(roomId, socketId));
      },
      replace: (
        roomId: RoomId,
        socketId: SocketId,
        nextIds: Iterable<string>,
      ): void => {
        const cache = getOrCreate(roomId, socketId);
        cache.clear();
        for (const nextId of nextIds) {
          cache.add(nextId);
        }
      },
    };
  };

  const visiblePlayerIds = createVisibleIdsAccessors(visiblePlayerIdsByRoomId);
  const visibleBombIds = createVisibleIdsAccessors(visibleBombIdsByRoomId);
  const visibleHurricaneIds = createVisibleIdsAccessors(
    visibleHurricaneIdsByRoomId,
  );

  // 指定ソケットのキャッシュを全ルームから削除し，空になったルームも畳む
  const releaseSocketScopedCache = <T>(
    roomCache: Map<RoomId, Map<SocketId, T>>,
    socketId: SocketId,
  ): void => {
    roomCache.forEach((bySocketId, roomId) => {
      bySocketId.delete(socketId);

      if (bySocketId.size === 0) {
        roomCache.delete(roomId);
      }
    });
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
    getVisiblePlayerIdsSnapshot: visiblePlayerIds.getSnapshot,
    getVisibleBombIdsSnapshot: visibleBombIds.getSnapshot,
    getVisibleHurricaneIdsSnapshot: visibleHurricaneIds.getSnapshot,
    replaceVisiblePlayerIds: visiblePlayerIds.replace,
    replaceVisibleBombIds: visibleBombIds.replace,
    replaceVisibleHurricaneIds: visibleHurricaneIds.replace,
    releaseSocket: (socketId) => {
      releaseSocketScopedCache(playerPositionCacheByRoomId, socketId);
      releaseSocketScopedCache(aoiCellCacheByRoomId, socketId);
      releaseSocketScopedCache(visiblePlayerIdsByRoomId, socketId);
      releaseSocketScopedCache(visibleBombIdsByRoomId, socketId);
      releaseSocketScopedCache(visibleHurricaneIdsByRoomId, socketId);
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
