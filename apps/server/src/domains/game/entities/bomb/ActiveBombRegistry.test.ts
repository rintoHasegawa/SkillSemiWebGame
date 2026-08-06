/**
 * ActiveBombRegistry.test
 * アクティブ爆弾レジストリの現行挙動を固定する characterization test
 * 登録・爆発回収の境界条件とスナップショット取得を検証する
 */
import { describe, expect, it } from "vitest";

import { ActiveBombRegistry, type ActiveBomb } from "./ActiveBombRegistry";

/** テスト用のアクティブ爆弾を生成する */
const createBomb = (overrides: Partial<ActiveBomb> = {}): ActiveBomb => {
  return {
    bombId: "bomb-1",
    ownerPlayerId: "player-1",
    x: 100,
    y: 200,
    explodeAtElapsedMs: 1000,
    ownerTeamId: 1,
    ...overrides,
  };
};

describe("ActiveBombRegistry.registerBomb", () => {
  it("登録した爆弾がスナップショットに含まれること", () => {
    const registry = new ActiveBombRegistry();
    const bomb = createBomb();

    registry.registerBomb(bomb);

    expect(registry.getActiveBombSnapshots()).toEqual([bomb]);
  });

  it("同一bombIdで登録した場合は後の内容で上書きすること", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ x: 10 }));
    registry.registerBomb(createBomb({ x: 99 }));

    const snapshots = registry.getActiveBombSnapshots();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].x).toBe(99);
  });

  it("異なるbombIdは別エントリとして保持すること", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ bombId: "bomb-1" }));
    registry.registerBomb(createBomb({ bombId: "bomb-2" }));

    expect(registry.getActiveBombSnapshots()).toHaveLength(2);
  });
});

describe("ActiveBombRegistry.collectExplodedBombs", () => {
  it("爆発時刻未満の場合は回収しないこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ explodeAtElapsedMs: 1000 }));

    expect(registry.collectExplodedBombs(999)).toEqual([]);
  });

  it("爆発時刻と同値の場合は回収すること", () => {
    const registry = new ActiveBombRegistry();
    const bomb = createBomb({ explodeAtElapsedMs: 1000 });
    registry.registerBomb(bomb);

    expect(registry.collectExplodedBombs(1000)).toEqual([bomb]);
  });

  it("爆発時刻超過の場合は回収すること", () => {
    const registry = new ActiveBombRegistry();
    const bomb = createBomb({ explodeAtElapsedMs: 1000 });
    registry.registerBomb(bomb);

    expect(registry.collectExplodedBombs(1001)).toEqual([bomb]);
  });

  it("回収した爆弾はレジストリから除去されること", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ explodeAtElapsedMs: 1000 }));

    registry.collectExplodedBombs(1000);

    expect(registry.getActiveBombSnapshots()).toEqual([]);
  });

  it("同じ爆弾を二度回収しないこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ explodeAtElapsedMs: 1000 }));

    registry.collectExplodedBombs(1000);

    expect(registry.collectExplodedBombs(2000)).toEqual([]);
  });

  it("未到達の爆弾はレジストリに残ること", () => {
    const registry = new ActiveBombRegistry();
    const expired = createBomb({ bombId: "bomb-1", explodeAtElapsedMs: 500 });
    const pending = createBomb({ bombId: "bomb-2", explodeAtElapsedMs: 1500 });
    registry.registerBomb(expired);
    registry.registerBomb(pending);

    registry.collectExplodedBombs(1000);

    expect(registry.getActiveBombSnapshots()).toEqual([pending]);
  });

  it("到達済みの爆弾のみを返すこと", () => {
    const registry = new ActiveBombRegistry();
    const expired = createBomb({ bombId: "bomb-1", explodeAtElapsedMs: 500 });
    const pending = createBomb({ bombId: "bomb-2", explodeAtElapsedMs: 1500 });
    registry.registerBomb(expired);
    registry.registerBomb(pending);

    expect(registry.collectExplodedBombs(1000)).toEqual([expired]);
  });

  it("複数回収時は登録順で返すこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ bombId: "bomb-a", explodeAtElapsedMs: 900 }));
    registry.registerBomb(createBomb({ bombId: "bomb-b", explodeAtElapsedMs: 100 }));

    const collected = registry.collectExplodedBombs(1000);

    expect(collected.map((bomb) => bomb.bombId)).toEqual(["bomb-a", "bomb-b"]);
  });

  it("空のレジストリでは空配列を返すこと", () => {
    const registry = new ActiveBombRegistry();

    expect(registry.collectExplodedBombs(1000)).toEqual([]);
  });

  it("経過時刻0でも爆発時刻0の爆弾は回収すること", () => {
    const registry = new ActiveBombRegistry();
    const bomb = createBomb({ explodeAtElapsedMs: 0 });
    registry.registerBomb(bomb);

    expect(registry.collectExplodedBombs(0)).toEqual([bomb]);
  });

  it("経過時刻が負の場合は爆発時刻0の爆弾を回収しないこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ explodeAtElapsedMs: 0 }));

    expect(registry.collectExplodedBombs(-1)).toEqual([]);
  });

  it("経過時刻がNaNの場合は回収しないこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ explodeAtElapsedMs: 0 }));

    expect(registry.collectExplodedBombs(Number.NaN)).toEqual([]);
  });

  it("爆発時刻がNaNの爆弾は回収されず残り続けること", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ explodeAtElapsedMs: Number.NaN }));

    expect(registry.collectExplodedBombs(Number.MAX_SAFE_INTEGER)).toEqual([]);
    expect(registry.getActiveBombSnapshots()).toHaveLength(1);
  });

  it("経過時刻がInfinityの場合はすべて回収すること", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ bombId: "bomb-1" }));
    registry.registerBomb(createBomb({ bombId: "bomb-2" }));

    expect(registry.collectExplodedBombs(Number.POSITIVE_INFINITY)).toHaveLength(2);
  });

  it("回収した要素は登録時のオブジェクト参照と同一であること", () => {
    const registry = new ActiveBombRegistry();
    const bomb = createBomb({ explodeAtElapsedMs: 0 });
    registry.registerBomb(bomb);

    expect(registry.collectExplodedBombs(0)[0]).toBe(bomb);
  });
});

describe("ActiveBombRegistry.clear", () => {
  it("登録済み爆弾をすべて破棄すること", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ bombId: "bomb-1" }));
    registry.registerBomb(createBomb({ bombId: "bomb-2" }));

    registry.clear();

    expect(registry.getActiveBombSnapshots()).toEqual([]);
  });

  it("空のレジストリに対しても例外を投げないこと", () => {
    const registry = new ActiveBombRegistry();

    expect(() => registry.clear()).not.toThrow();
  });

  it("破棄後に爆発時刻へ到達しても回収されないこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ explodeAtElapsedMs: 0 }));

    registry.clear();

    expect(registry.collectExplodedBombs(9999)).toEqual([]);
  });
});

describe("ActiveBombRegistry.getActiveBombSnapshots", () => {
  it("未登録の場合は空配列を返すこと", () => {
    const registry = new ActiveBombRegistry();

    expect(registry.getActiveBombSnapshots()).toEqual([]);
  });

  it("呼び出しごとに別の配列インスタンスを返すこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb());

    expect(registry.getActiveBombSnapshots()).not.toBe(
      registry.getActiveBombSnapshots(),
    );
  });

  it("返す要素は登録時のオブジェクト参照と同一であること", () => {
    const registry = new ActiveBombRegistry();
    const bomb = createBomb();
    registry.registerBomb(bomb);

    expect(registry.getActiveBombSnapshots()[0]).toBe(bomb);
  });

  it("登録順で返すこと", () => {
    const registry = new ActiveBombRegistry();
    registry.registerBomb(createBomb({ bombId: "bomb-b" }));
    registry.registerBomb(createBomb({ bombId: "bomb-a" }));

    expect(
      registry.getActiveBombSnapshots().map((bomb) => bomb.bombId),
    ).toEqual(["bomb-b", "bomb-a"]);
  });
});
