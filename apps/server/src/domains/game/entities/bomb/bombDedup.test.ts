/**
 * bombDedup.test
 * 爆弾関連イベントの重複排除判定の仕様を検証するユニットテスト
 * TTL計算・期限切れ削除の境界条件と非有限時刻・非有限期限の防御を検証する
 */
import { config } from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  shouldBroadcastBombHitReport,
  shouldBroadcastBombPlaced,
} from "./bombDedup";

const ttlMs
  = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;

describe("shouldBroadcastBombPlaced", () => {
  it("未登録キーの場合はtrueを返すこと", () => {
    const dedupTable = new Map<string, number>();

    expect(
      shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 100 }),
    ).toBe(true);
  });

  it("配信可の場合はTTLを加算した期限をテーブルに登録すること", () => {
    const dedupTable = new Map<string, number>();

    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 100 });

    expect(dedupTable.get("key-1")).toBe(100 + ttlMs);
  });

  it("TTLはBOMB_FUSE_MSとBOMB_DEDUP_EXTRA_TTL_MSの和であること", () => {
    const dedupTable = new Map<string, number>();

    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 0 });

    expect(dedupTable.get("key-1")).toBe(
      config.GAME_CONFIG.BOMB_FUSE_MS
      + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS,
    );
  });

  it("同一キーの二度目の判定ではfalseを返すこと", () => {
    const dedupTable = new Map<string, number>();
    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 100 });

    expect(
      shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 100 }),
    ).toBe(false);
  });

  it("falseを返す場合は既存の期限を更新しないこと", () => {
    const dedupTable = new Map<string, number>();
    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 100 });

    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 500 });

    expect(dedupTable.get("key-1")).toBe(100 + ttlMs);
  });

  it("異なるキーは独立して配信可と判定すること", () => {
    const dedupTable = new Map<string, number>();
    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 100 });

    expect(
      shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-2", nowMs: 100 }),
    ).toBe(true);
  });

  it("期限が現在時刻と同値のエントリは期限切れとして削除されること", () => {
    const dedupTable = new Map<string, number>([["key-1", 1000]]);

    expect(
      shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 1000 }),
    ).toBe(true);
  });

  it("期限が現在時刻より1ms先のエントリは保持されfalseを返すこと", () => {
    const dedupTable = new Map<string, number>([["key-1", 1001]]);

    expect(
      shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 1000 }),
    ).toBe(false);
  });

  it("判定対象以外の期限切れエントリも削除すること", () => {
    const dedupTable = new Map<string, number>([
      ["expired", 500],
      ["alive", 5000],
    ]);

    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 1000 });

    expect(dedupTable.has("expired")).toBe(false);
    expect(dedupTable.has("alive")).toBe(true);
  });

  it("現在時刻0でもTTLを加算した期限を登録すること", () => {
    const dedupTable = new Map<string, number>();

    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 0 });

    expect(dedupTable.get("key-1")).toBe(ttlMs);
  });

  it("空文字キーでも配信可と判定して登録すること", () => {
    const dedupTable = new Map<string, number>();

    expect(
      shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "", nowMs: 0 }),
    ).toBe(true);
    expect(dedupTable.has("")).toBe(true);
  });

  it("期限切れ後は同一キーで再度trueを返すこと", () => {
    const dedupTable = new Map<string, number>();
    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 0 });

    expect(
      shouldBroadcastBombPlaced({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: ttlMs,
      }),
    ).toBe(true);
  });

  it("現在時刻がNaNの場合は配信不可としてfalseを返すこと", () => {
    const dedupTable = new Map<string, number>([["key-1", 1]]);

    expect(
      shouldBroadcastBombPlaced({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: Number.NaN,
      }),
    ).toBe(false);
  });

  it("現在時刻がNaNの場合は新規キーを登録しないこと", () => {
    const dedupTable = new Map<string, number>();

    shouldBroadcastBombPlaced({
      dedupTable,
      dedupeKey: "key-1",
      nowMs: Number.NaN,
    });

    expect(dedupTable.has("key-1")).toBe(false);
  });

  it("現在時刻がInfinityの場合は配信不可としてfalseを返すこと", () => {
    const dedupTable = new Map<string, number>();

    expect(
      shouldBroadcastBombPlaced({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: Number.POSITIVE_INFINITY,
      }),
    ).toBe(false);
  });

  it("現在時刻が非有限の場合は既存エントリを削除しないこと", () => {
    const dedupTable = new Map<string, number>([["expired", 1]]);

    shouldBroadcastBombPlaced({
      dedupTable,
      dedupeKey: "key-1",
      nowMs: Number.NaN,
    });

    expect(dedupTable.has("expired")).toBe(true);
  });

  it("期限が非有限のエントリを期限切れとして削除すること", () => {
    const dedupTable = new Map<string, number>([["broken", Number.NaN]]);

    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 1000 });

    expect(dedupTable.has("broken")).toBe(false);
  });

  it("期限がInfinityのエントリを期限切れとして削除すること", () => {
    const dedupTable = new Map<string, number>([
      ["broken", Number.POSITIVE_INFINITY],
    ]);

    shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 1000 });

    expect(dedupTable.has("broken")).toBe(false);
  });

  it("期限が非有限だったキーは再度配信可と判定されること", () => {
    const dedupTable = new Map<string, number>([["key-1", Number.NaN]]);

    expect(
      shouldBroadcastBombPlaced({ dedupTable, dedupeKey: "key-1", nowMs: 1000 }),
    ).toBe(true);
  });
});

describe("shouldBroadcastBombHitReport", () => {
  it("未登録キーの場合はtrueを返すこと", () => {
    const dedupTable = new Map<string, number>();

    expect(
      shouldBroadcastBombHitReport({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: 100,
      }),
    ).toBe(true);
  });

  it("配信可の場合はTTLを加算した期限をテーブルに登録すること", () => {
    const dedupTable = new Map<string, number>();

    shouldBroadcastBombHitReport({ dedupTable, dedupeKey: "key-1", nowMs: 100 });

    expect(dedupTable.get("key-1")).toBe(100 + ttlMs);
  });

  it("同一キーの二度目の判定ではfalseを返すこと", () => {
    const dedupTable = new Map<string, number>();
    shouldBroadcastBombHitReport({ dedupTable, dedupeKey: "key-1", nowMs: 100 });

    expect(
      shouldBroadcastBombHitReport({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: 100,
      }),
    ).toBe(false);
  });

  it("異なるキーは独立して配信可と判定すること", () => {
    const dedupTable = new Map<string, number>();
    shouldBroadcastBombHitReport({ dedupTable, dedupeKey: "key-1", nowMs: 100 });

    expect(
      shouldBroadcastBombHitReport({
        dedupTable,
        dedupeKey: "key-2",
        nowMs: 100,
      }),
    ).toBe(true);
  });

  it("期限が現在時刻と同値のエントリは期限切れとして削除されること", () => {
    const dedupTable = new Map<string, number>([["key-1", 1000]]);

    expect(
      shouldBroadcastBombHitReport({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: 1000,
      }),
    ).toBe(true);
  });

  it("期限が現在時刻より1ms先のエントリは保持されfalseを返すこと", () => {
    const dedupTable = new Map<string, number>([["key-1", 1001]]);

    expect(
      shouldBroadcastBombHitReport({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: 1000,
      }),
    ).toBe(false);
  });

  it("判定対象以外の期限切れエントリも削除すること", () => {
    const dedupTable = new Map<string, number>([
      ["expired", 500],
      ["alive", 5000],
    ]);

    shouldBroadcastBombHitReport({
      dedupTable,
      dedupeKey: "key-1",
      nowMs: 1000,
    });

    expect(dedupTable.has("expired")).toBe(false);
    expect(dedupTable.has("alive")).toBe(true);
  });

  it("現在時刻0でもTTLを加算した期限を登録すること", () => {
    const dedupTable = new Map<string, number>();

    shouldBroadcastBombHitReport({ dedupTable, dedupeKey: "key-1", nowMs: 0 });

    expect(dedupTable.get("key-1")).toBe(ttlMs);
  });

  it("期限切れ後は同一キーで再度trueを返すこと", () => {
    const dedupTable = new Map<string, number>();
    shouldBroadcastBombHitReport({ dedupTable, dedupeKey: "key-1", nowMs: 0 });

    expect(
      shouldBroadcastBombHitReport({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: ttlMs,
      }),
    ).toBe(true);
  });

  it("現在時刻がNaNの場合は配信不可としてfalseを返すこと", () => {
    const dedupTable = new Map<string, number>();

    expect(
      shouldBroadcastBombHitReport({
        dedupTable,
        dedupeKey: "key-1",
        nowMs: Number.NaN,
      }),
    ).toBe(false);
  });

  it("現在時刻がNaNの場合は新規キーを登録しないこと", () => {
    const dedupTable = new Map<string, number>();

    shouldBroadcastBombHitReport({
      dedupTable,
      dedupeKey: "key-1",
      nowMs: Number.NaN,
    });

    expect(dedupTable.has("key-1")).toBe(false);
  });

  it("期限が非有限のエントリを期限切れとして削除すること", () => {
    const dedupTable = new Map<string, number>([["broken", Number.NaN]]);

    shouldBroadcastBombHitReport({
      dedupTable,
      dedupeKey: "key-1",
      nowMs: 1000,
    });

    expect(dedupTable.has("broken")).toBe(false);
  });

  it("設置用と同一のTTLを使用すること", () => {
    const placedTable = new Map<string, number>();
    const hitReportTable = new Map<string, number>();

    shouldBroadcastBombPlaced({
      dedupTable: placedTable,
      dedupeKey: "key-1",
      nowMs: 0,
    });
    shouldBroadcastBombHitReport({
      dedupTable: hitReportTable,
      dedupeKey: "key-1",
      nowMs: 0,
    });

    expect(hitReportTable.get("key-1")).toBe(placedTable.get("key-1"));
  });
});
