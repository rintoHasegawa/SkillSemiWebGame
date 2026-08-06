/**
 * BombStateStore.test
 * 爆弾セッション状態ストアの現行挙動を固定する characterization test
 * 重複排除テーブルの独立性・採番の連番・設置者マップの保持を検証する
 */
import { config } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { ActiveBombRegistry } from "./ActiveBombRegistry";
import { BombStateStore } from "./BombStateStore";

const ttlMs
  = config.GAME_CONFIG.BOMB_FUSE_MS + config.GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS;

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

    expect(store.shouldBroadcastBombHitReport("key-1", ttlMs)).toBe(true);
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
  it("初回は爆弾ID1を採番すること", () => {
    const store = new BombStateStore();

    expect(store.issueServerBombId()).toBe("1");
  });

  it("呼び出しごとに連番を進めること", () => {
    const store = new BombStateStore();

    expect([
      store.issueServerBombId(),
      store.issueServerBombId(),
      store.issueServerBombId(),
    ]).toEqual(["1", "2", "3"]);
  });

  it("ストアが異なれば採番は1から始まること", () => {
    const store = new BombStateStore();
    store.issueServerBombId();

    expect(new BombStateStore().issueServerBombId()).toBe("1");
  });
});

describe("BombStateStore.registerBombOwner", () => {
  it("登録した設置者プレイヤーIDを取得できること", () => {
    const store = new BombStateStore();

    store.registerBombOwner("bomb-1", "player-1");

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });

  it("同一爆弾IDの再登録では後の設置者で上書きすること", () => {
    const store = new BombStateStore();
    store.registerBombOwner("bomb-1", "player-1");

    store.registerBombOwner("bomb-1", "player-2");

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-2");
  });

  it("爆弾IDが空文字でも登録できること", () => {
    const store = new BombStateStore();

    store.registerBombOwner("", "player-1");

    expect(store.getBombOwnerPlayerId("")).toBe("player-1");
  });

  it("アクティブ爆弾の回収後も設置者を保持すること", () => {
    const store = new BombStateStore();
    store.registerBombOwner("bomb-1", "player-1");
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
    store.registerBombOwner("bomb-1", "player-1");

    store.activeBombRegistry.clear();

    expect(store.getBombOwnerPlayerId("bomb-1")).toBe("player-1");
  });
});

describe("BombStateStore.getBombOwnerPlayerId", () => {
  it("未登録の爆弾IDにはundefinedを返すこと", () => {
    const store = new BombStateStore();

    expect(store.getBombOwnerPlayerId("bomb-unknown")).toBeUndefined();
  });

  it("ストアが異なれば設置者を共有しないこと", () => {
    const store = new BombStateStore();
    store.registerBombOwner("bomb-1", "player-1");

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
