/**
 * syncDelta
 * ID単位の前回同期スナップショットと比較して差分抽出する共通関数を提供する
 */

/** ID単位で抽出した差分1件の構造 */
export type SyncDeltaEntry<TItem, TSnapshot> = {
  item: TItem;
  snapshot: TSnapshot;
};

/** 差分抽出時に必要な比較ルール */
export type SyncDeltaOptions<TItem, TSnapshot> = {
  selectId: (item: TItem) => string;
  toSnapshot: (item: TItem) => TSnapshot;
  isSameSnapshot: (left: TSnapshot, right: TSnapshot) => boolean;
};

/** ID別の前回同期状態を参照して差分のみ抽出する */
export const collectSyncDeltaEntries = <TItem, TSnapshot>(
  items: TItem[],
  lastSnapshotById: Map<string, TSnapshot>,
  options: SyncDeltaOptions<TItem, TSnapshot>,
): SyncDeltaEntry<TItem, TSnapshot>[] => {
  const changedEntries: SyncDeltaEntry<TItem, TSnapshot>[] = [];

  items.forEach((item) => {
    const id = options.selectId(item);
    const nextSnapshot = options.toSnapshot(item);
    const lastSnapshot = lastSnapshotById.get(id);

    // 偽値スナップショット（0・""・false）を未登録と誤判定しないよう，
    // 真偽値ではなく「登録済みか（undefined でないか）」で判定する
    const isUnchanged =
      lastSnapshot !== undefined &&
      options.isSameSnapshot(lastSnapshot, nextSnapshot);

    if (isUnchanged) {
      return;
    }

    lastSnapshotById.set(id, nextSnapshot);
    changedEntries.push({
      item,
      snapshot: nextSnapshot,
    });
  });

  return changedEntries;
};
