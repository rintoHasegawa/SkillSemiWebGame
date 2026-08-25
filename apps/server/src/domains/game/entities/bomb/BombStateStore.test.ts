/**
 * BombStateStore.test
 * 爆弾セッション状態ストアの挙動を検証するユニットテスト
 * 重複排除テーブルの独立性・採番の一意性・爆弾レコードの保持を検証する
 */
import { config } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { ActiveBombRegistry } from "./ActiveBombRegistry";
import { BombStateStore, type RetainedBombRecord } from "./BombStateStore";

const ttlMs
  = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;

// 被弾報告は受理窓より必ず長いTTLで登録する
const hitReportTtlMs
  = config.GAME_CONFIG.BOMB_FUSE_MS
  + config.GAME_CONFIG.BOMB_HIT_REPORT_RETENTION_MS
  + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;

/**
 * 被弾報告の受理窓の最大長（ms）
 * 設置と同時刻に報告した場合の窓の終端（設置時刻＋導火線時間＋受理猶予）
 */
const hitReportAcceptWindowMs
  = config.GAME_CONFIG.BOMB_FUSE_MS
  + config.GAME_CONFIG.BOMB_HIT_REPORT_RETENTION_MS;

/** 爆発後に爆弾レコードを保持する猶予時間（ms） */
const recordRetentionMs = config.GAME_CONFIG.BOMB_HIT_REPORT_RETENTION_MS;

/** 被弾報告検証用の爆弾レコードを生成する */
const createBombRecord = (ownerPlayerId: string): RetainedBombRecord => {
  return { ownerPlayerId, x: 0, y: 0, explodeAtElapsedMs: 0 };
};

/** 設置者登録済みのアクティブ爆弾を持つストアを生成する */
const createStoreWithActiveBomb = (explodeAtElapsedMs = 0) => {
  const store = new BombStateStore();
  store.registerBombRecord("bomb-1", createBombRecord("player-1"));
  store.activeBombRegistry.registerBomb({
    bombId: "bomb-1",
    ownerPlayerId: "player-1",
    x: 0,
    y: 0,
    explodeAtElapsedMs,
    ownerTeamId: 1,
  });

  return store;
};

describe("BombStateStore.shouldBroadcastBombPlaced", () => {
  it("初回のキーはtrueを返すこと", () => {
    const store = new BombStateStore();

    expect(store.shouldBroadcastBombPlaced("key-1", 0)).toBe(true);
  });

  it("同一キーの二度目はfalseを返すこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombPlaced("key-1", 0);

    expect(store.shouldBroadcastBombPlaced("key-1", 0)).toBe(false);
  });

  it("異なるキーは独立してtrueを返すこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombPlaced("key-1", 0);

    expect(store.shouldBroadcastBombPlaced("key-2", 0)).toBe(true);
  });

  it("TTL経過後は同一キーで再度trueを返すこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombPlaced("key-1", 0);

    expect(store.shouldBroadcastBombPlaced("key-1", ttlMs)).toBe(true);
  });

  it("TTL経過直前は同一キーでfalseを返すこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombPlaced("key-1", 0);

    expect(store.shouldBroadcastBombPlaced("key-1", ttlMs - 1)).toBe(false);
  });

  it("ストアが異なれば重複排除状態を共有しないこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombPlaced("key-1", 0);

    expect(new BombStateStore().shouldBroadcastBombPlaced("key-1", 0)).toBe(
      true,
    );
  });
});

describe("BombStateStore.shouldAcceptBombPlacement", () => {
  it("初回の設置要求はtrueを返すこと", () => {
    const store = new BombStateStore();

    expect(store.shouldAcceptBombPlacement("player-1", 1_000, 4_000)).toBe(
      true,
    );
  });

  it("クールダウン未経過の再設置はfalseを返すこと", () => {
    const store = new BombStateStore();
    store.shouldAcceptBombPlacement("player-1", 1_000, 4_000);

    expect(store.shouldAcceptBombPlacement("player-1", 1_100, 4_000)).toBe(
      false,
    );
  });

  it("クールダウン経過後の再設置はtrueを返すこと", () => {
    const store = new BombStateStore();
    store.shouldAcceptBombPlacement("player-1", 1_000, 4_000);

    expect(store.shouldAcceptBombPlacement("player-1", 5_000, 4_000)).toBe(
      true,
    );
  });

  it("別プレイヤーのクールダウンは独立して判定すること", () => {
    const store = new BombStateStore();
    store.shouldAcceptBombPlacement("player-1", 1_000, 4_000);

    expect(store.shouldAcceptBombPlacement("player-2", 1_100, 4_000)).toBe(
      true,
    );
  });

  it("重複排除テーブルとは独立して判定すること", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombPlaced("key-1", 1_000);

    expect(store.shouldAcceptBombPlacement("player-1", 1_000, 4_000)).toBe(
      true,
    );
  });
});

describe("BombStateStore.shouldBroadcastBombHitReport", () => {
  it("初回のキーはtrueを返すこと", () => {
    const store = new BombStateStore();

    expect(store.shouldBroadcastBombHitReport("key-1", 0)).toBe(true);
  });

  it("同一キーの二度目はfalseを返すこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombHitReport("key-1", 0);

    expect(store.shouldBroadcastBombHitReport("key-1", 0)).toBe(false);
  });

  it("TTL経過後は同一キーで再度trueを返すこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombHitReport("key-1", 0);

    expect(store.shouldBroadcastBombHitReport("key-1", hitReportTtlMs)).toBe(
      true,
    );
  });

  it("設置用TTL経過時点では同一キーでfalseを返すこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombHitReport("key-1", 0);

    expect(store.shouldBroadcastBombHitReport("key-1", ttlMs)).toBe(false);
  });

  it("受理窓の内側で届いた同一キーの再報告をfalseとすること", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombHitReport("key-1", 0);

    expect(
      store.shouldBroadcastBombHitReport("key-1", hitReportAcceptWindowMs / 2),
    ).toBe(false);
  });

  it("受理窓の終端に届いた同一キーの再報告をfalseとすること", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombHitReport("key-1", 0);

    expect(
      store.shouldBroadcastBombHitReport("key-1", hitReportAcceptWindowMs),
    ).toBe(false);
  });

  it("重複排除TTLが受理窓より長いこと", () => {
    expect(hitReportTtlMs).toBeGreaterThan(hitReportAcceptWindowMs);
  });

  it("設置用の重複排除テーブルとは独立していること", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombPlaced("key-1", 0);

    expect(store.shouldBroadcastBombHitReport("key-1", 0)).toBe(true);
  });

  it("被弾報告の登録が設置判定へ影響しないこと", () => {
    const store = new BombStateStore();
    store.shouldBroadcastBombHitReport("key-1", 0);

    expect(store.shouldBroadcastBombPlaced("key-1", 0)).toBe(true);
  });
});

describe("BombStateStore.issueServerBombId", () => {
  it("初回から推測不能なUUIDを採番すること", () => {
    const store = new BombStateStore();

    expect(store.issueServerBombId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("呼び出しごとに異なる爆弾IDを採番すること", () => {
    const store = new BombStateStore();

    const bombIds = [
      store.issueServerBombId(),
      store.issueServerBombId(),
      store.issueServerBombId(),
    ];

    expect(new Set(bombIds).size).toBe(3);
  });

  it("ストアが異なれば採番結果を共有しないこと", () => {
    const store = new BombStateStore();

    expect(new BombStateStore().issueServerBombId()).not.toBe(
      store.issueServerBombId(),
    );
  });
});

describe("BombStateStore.registerBombRecord", () => {
  it("登録した設置者プレイヤーIDを取得できること", () => {
    const store = new BombStateStore();

    store.registerBombRecord("bomb-1", createBombRecord("player-1"));

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("同一爆弾IDの再登録では後の設置者で上書きすること", () => {
    const store = new BombStateStore();
    store.registerBombRecord("bomb-1", createBombRecord("player-1"));

    store.registerBombRecord("bomb-1", createBombRecord("player-2"));

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-2");
  });

  it("爆弾IDが空文字でも登録できること", () => {
    const store = new BombStateStore();

    store.registerBombRecord("", createBombRecord("player-1"));

    expect(store.getBombOwnerPlayerId("")).toBe("player-1");
  });

  it("アクティブ爆弾の回収後も設置者を保持すること", () => {
    const store = new BombStateStore();
    store.registerBombRecord("bomb-1", createBombRecord("player-1"));
    store.activeBombRegistry.registerBomb({
      bombId: "bomb-1",
      ownerPlayerId: "player-1",
      x: 0,
      y: 0,
      explodeAtElapsedMs: 0,
      ownerTeamId: 1,
    });

    store.activeBombRegistry.collectExplodedBombs(0);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("アクティブ爆弾レジストリのclear後も設置者を保持すること", () => {
    const store = new BombStateStore();
    store.registerBombRecord("bomb-1", createBombRecord("player-1"));

    store.activeBombRegistry.clear();

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });
});

describe("BombStateStore.getBombOwnerPlayerId（回収後の猶予解放）", () => {
  it("回収直後は設置者を保持すること", () => {
    const store = createStoreWithActiveBomb();

    store.activeBombRegistry.collectExplodedBombs(0);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("猶予経過直前の回収呼び出しでは設置者を保持すること", () => {
    const store = createStoreWithActiveBomb();
    store.activeBombRegistry.collectExplodedBombs(0);

    store.activeBombRegistry.collectExplodedBombs(recordRetentionMs - 1);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("猶予到達時の回収呼び出しで設置者を解放すること", () => {
    const store = createStoreWithActiveBomb();
    store.activeBombRegistry.collectExplodedBombs(0);

    store.activeBombRegistry.collectExplodedBombs(recordRetentionMs);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBeUndefined();
  });

  it("猶予超過時の回収呼び出しで設置者を解放すること", () => {
    const store = createStoreWithActiveBomb();
    store.activeBombRegistry.collectExplodedBombs(0);

    store.activeBombRegistry.collectExplodedBombs(recordRetentionMs + 1);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBeUndefined();
  });

  it("回収の起点となる爆発時刻から猶予を数えること", () => {
    const store = createStoreWithActiveBomb(5_000);
    store.activeBombRegistry.collectExplodedBombs(5_000);

    store.activeBombRegistry.collectExplodedBombs(5_000 + recordRetentionMs - 1);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("回収されていない爆弾の設置者は猶予経過後も保持すること", () => {
    const store = createStoreWithActiveBomb();
    store.registerBombRecord("bomb-2", createBombRecord("player-2"));

    store.activeBombRegistry.collectExplodedBombs(0);
    store.activeBombRegistry.collectExplodedBombs(recordRetentionMs);

    expect(store.getBombOwnerPlayerId("bomb-2")).toBe("player-2");
  });

  it("経過時刻が非有限の回収では設置者を解放しないこと", () => {
    const store = createStoreWithActiveBomb();

    store.activeBombRegistry.collectExplodedBombs(Number.POSITIVE_INFINITY);
    store.activeBombRegistry.collectExplodedBombs(Number.MAX_SAFE_INTEGER);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("回収が発生しない呼び出しだけでは設置者を解放しないこと", () => {
    const store = createStoreWithActiveBomb(10_000);

    store.activeBombRegistry.collectExplodedBombs(recordRetentionMs + 1);

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("解放後に同じ爆弾IDを再登録すれば再び取得できること", () => {
    const store = createStoreWithActiveBomb();
    store.activeBombRegistry.collectExplodedBombs(0);
    store.activeBombRegistry.collectExplodedBombs(recordRetentionMs);

    store.registerBombRecord("bomb-1", createBombRecord("player-9"));

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-9");
  });
});

describe("BombStateStore.getBombOwnerPlayerId", () => {
  it("未登録の爆弾IDにはundefinedを返すこと", () => {
    const store = new BombStateStore();

    expect(store.getBombOwnerPlayerId("bomb-unknown")).toBeUndefined();
  });

  it("ストアが異なれば設置者を共有しないこと", () => {
    const store = new BombStateStore();
    store.registerBombRecord("bomb-1", createBombRecord("player-1"));

    expect(new BombStateStore().getBombOwnerPlayerId("bomb-1")).toBeUndefined();
  });
});

describe("BombStateStore.activeBombRegistry", () => {
  it("アクティブ爆弾レジストリを公開すること", () => {
    const store = new BombStateStore();

    expect(store.activeBombRegistry).toBeInstanceOf(ActiveBombRegistry);
  });

  it("生成直後のアクティブ爆弾は空であること", () => {
    const store = new BombStateStore();

    expect(store.activeBombRegistry.getActiveBombSnapshots()).toEqual([]);
  });

  it("ストアが異なればレジストリも別インスタンスであること", () => {
    expect(new BombStateStore().activeBombRegistry).not.toBe(
      new BombStateStore().activeBombRegistry,
    );
  });
});
