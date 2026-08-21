/**
 * realtimeRoomSyncState.test
 * 高頻度同期のルーム状態ストアの現行挙動を固定する characterization test
 * ルーム・ソケット単位の分離とスナップショット複製・初期化の境界挙動を検証する
 */
import { describe, expect, it } from "vitest";

import { createRealtimeRoomSyncStateStore } from "./realtimeRoomSyncState";

describe("createRealtimeRoomSyncStateStore.getPlayerPositionCache", () => {
  it("初回参照時は空のMapを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    expect(store.getPlayerPositionCache("room-1", "socket-1").size).toBe(0);
  });

  it("同一ルーム・同一ソケットでは同じMapインスタンスを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    const first = store.getPlayerPositionCache("room-1", "socket-1");
    const second = store.getPlayerPositionCache("room-1", "socket-1");

    expect(second).toBe(first);
  });

  it("返したMapへの書き込みが次回参照へ反映されること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.getPlayerPositionCache("room-1", "socket-1").set("p1", { x: 1, y: 2 });

    expect(
      store.getPlayerPositionCache("room-1", "socket-1").get("p1"),
    ).toEqual({ x: 1, y: 2 });
  });

  it("ソケットが異なる場合は別のMapを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    const first = store.getPlayerPositionCache("room-1", "socket-1");
    const second = store.getPlayerPositionCache("room-1", "socket-2");

    expect(second).not.toBe(first);
  });

  it("ルームが異なる場合は別のMapを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    const first = store.getPlayerPositionCache("room-1", "socket-1");
    const second = store.getPlayerPositionCache("room-2", "socket-1");

    expect(second).not.toBe(first);
  });

  it("空文字のルームIDでもキャッシュを生成すること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.getPlayerPositionCache("", "socket-1").set("p1", { x: 0, y: 0 });

    expect(store.getPlayerPositionCache("", "socket-1").size).toBe(1);
  });
});

describe("createRealtimeRoomSyncStateStore.getLastAoiCell", () => {
  it("未設定の場合はundefinedを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    expect(store.getLastAoiCell("room-1", "socket-1")).toBeUndefined();
  });

  it("設定済みのセルを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.setLastAoiCell("room-1", "socket-1", { col: 2, row: 3 });

    expect(store.getLastAoiCell("room-1", "socket-1")).toEqual({
      col: 2,
      row: 3,
    });
  });

  it("別ソケットのセルは参照しないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.setLastAoiCell("room-1", "socket-1", { col: 2, row: 3 });

    expect(store.getLastAoiCell("room-1", "socket-2")).toBeUndefined();
  });

  it("別ルームのセルは参照しないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.setLastAoiCell("room-1", "socket-1", { col: 2, row: 3 });

    expect(store.getLastAoiCell("room-2", "socket-1")).toBeUndefined();
  });

  it("参照時にキャッシュを生成しないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.getLastAoiCell("room-1", "socket-1");
    store.setLastAoiCell("room-1", "socket-2", { col: 0, row: 0 });

    expect(store.getLastAoiCell("room-1", "socket-1")).toBeUndefined();
  });
});

describe("createRealtimeRoomSyncStateStore.setLastAoiCell", () => {
  it("後から設定した値で上書きすること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.setLastAoiCell("room-1", "socket-1", { col: 1, row: 1 });
    store.setLastAoiCell("room-1", "socket-1", { col: -4, row: 9 });

    expect(store.getLastAoiCell("room-1", "socket-1")).toEqual({
      col: -4,
      row: 9,
    });
  });

  it("渡したセルオブジェクトの参照をそのまま保持すること", () => {
    const store = createRealtimeRoomSyncStateStore();
    const cell = { col: 0, row: 0 };

    store.setLastAoiCell("room-1", "socket-1", cell);

    expect(store.getLastAoiCell("room-1", "socket-1")).toBe(cell);
  });

  it("負値のセル座標も保持すること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.setLastAoiCell("room-1", "socket-1", { col: -1, row: -1 });

    expect(store.getLastAoiCell("room-1", "socket-1")).toEqual({
      col: -1,
      row: -1,
    });
  });
});

describe("createRealtimeRoomSyncStateStore.getVisiblePlayerIdsSnapshot", () => {
  it("未設定の場合は空のSetを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    expect(store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      0,
    );
  });

  it("呼び出しごとに別インスタンスの複製を返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    const first = store.getVisiblePlayerIdsSnapshot("room-1", "socket-1");
    const second = store.getVisiblePlayerIdsSnapshot("room-1", "socket-1");

    expect(second).not.toBe(first);
  });

  it("取得した複製への追加が内部状態へ反映されないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").add("p1");

    expect(store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      0,
    );
  });

  it("replaceVisiblePlayerIdsで設定した内容を返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1", "p2"]);

    expect([
      ...store.getVisiblePlayerIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["p1", "p2"]);
  });
});

describe("createRealtimeRoomSyncStateStore.replaceVisiblePlayerIds", () => {
  it("既存の可視IDを新しい集合で置き換えること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1", "p2"]);
    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p3"]);

    expect([
      ...store.getVisiblePlayerIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["p3"]);
  });

  it("空のIterableを渡した場合は可視IDを空にすること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1"]);
    store.replaceVisiblePlayerIds("room-1", "socket-1", []);

    expect(store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      0,
    );
  });

  it("Setを渡した場合も可視IDへ反映すること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisiblePlayerIds("room-1", "socket-1", new Set(["p1", "p2"]));

    expect(store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      2,
    );
  });

  it("重複IDを渡した場合は1件として保持すること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1", "p1"]);

    expect(store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      1,
    );
  });

  it("他ソケットの可視IDへ影響しないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1"]);
    store.replaceVisiblePlayerIds("room-1", "socket-2", ["p2"]);

    expect([
      ...store.getVisiblePlayerIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["p1"]);
  });
});

describe("createRealtimeRoomSyncStateStore.getVisibleBombIdsSnapshot", () => {
  it("未設定の場合は空のSetを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    expect(store.getVisibleBombIdsSnapshot("room-1", "socket-1").size).toBe(0);
  });

  it("replaceVisibleBombIdsで設定した内容を返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisibleBombIds("room-1", "socket-1", ["bomb-1"]);

    expect(
      store.getVisibleBombIdsSnapshot("room-1", "socket-1").has("bomb-1"),
    ).toBe(true);
  });

  it("プレイヤー可視IDとは独立していること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1"]);

    expect(store.getVisibleBombIdsSnapshot("room-1", "socket-1").size).toBe(0);
  });

  it("取得した複製への追加が内部状態へ反映されないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.getVisibleBombIdsSnapshot("room-1", "socket-1").add("bomb-1");

    expect(store.getVisibleBombIdsSnapshot("room-1", "socket-1").size).toBe(0);
  });
});

describe("createRealtimeRoomSyncStateStore.replaceVisibleBombIds", () => {
  it("既存の可視爆弾IDを置き換えること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisibleBombIds("room-1", "socket-1", ["bomb-1"]);
    store.replaceVisibleBombIds("room-1", "socket-1", ["bomb-2"]);

    expect([...store.getVisibleBombIdsSnapshot("room-1", "socket-1")]).toEqual([
      "bomb-2",
    ]);
  });

  it("空を渡した場合は可視爆弾IDを空にすること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisibleBombIds("room-1", "socket-1", ["bomb-1"]);
    store.replaceVisibleBombIds("room-1", "socket-1", []);

    expect(store.getVisibleBombIdsSnapshot("room-1", "socket-1").size).toBe(0);
  });
});

describe("createRealtimeRoomSyncStateStore.getVisibleHurricaneIdsSnapshot", () => {
  it("未設定の場合は空のSetを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    expect(store.getVisibleHurricaneIdsSnapshot("room-1", "socket-1").size).toBe(
      0,
    );
  });

  it("replaceVisibleHurricaneIdsで設定した内容を返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisibleHurricaneIds("room-1", "socket-1", ["h1", "h2"]);

    expect([
      ...store.getVisibleHurricaneIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["h1", "h2"]);
  });

  it("爆弾可視IDとは独立していること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisibleBombIds("room-1", "socket-1", ["bomb-1"]);

    expect(
      store.getVisibleHurricaneIdsSnapshot("room-1", "socket-1").size,
    ).toBe(0);
  });
});

describe("createRealtimeRoomSyncStateStore.replaceVisibleHurricaneIds", () => {
  it("既存の可視ハリケーンIDを置き換えること", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisibleHurricaneIds("room-1", "socket-1", ["h1"]);
    store.replaceVisibleHurricaneIds("room-1", "socket-1", ["h2", "h3"]);

    expect([
      ...store.getVisibleHurricaneIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["h2", "h3"]);
  });

  it("他ルームの可視ハリケーンIDへ影響しないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    store.replaceVisibleHurricaneIds("room-1", "socket-1", ["h1"]);
    store.replaceVisibleHurricaneIds("room-2", "socket-1", ["h2"]);

    expect([
      ...store.getVisibleHurricaneIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["h1"]);
  });
});

describe("createRealtimeRoomSyncStateStore.resetRoom", () => {
  it("対象ルームの座標キャッシュを破棄すること", () => {
    const store = createRealtimeRoomSyncStateStore();
    store.getPlayerPositionCache("room-1", "socket-1").set("p1", { x: 1, y: 1 });

    store.resetRoom("room-1");

    expect(store.getPlayerPositionCache("room-1", "socket-1").size).toBe(0);
  });

  it("破棄後は新しいMapインスタンスを返すこと", () => {
    const store = createRealtimeRoomSyncStateStore();
    const before = store.getPlayerPositionCache("room-1", "socket-1");

    store.resetRoom("room-1");

    expect(store.getPlayerPositionCache("room-1", "socket-1")).not.toBe(before);
  });

  it("対象ルームのAOIセルを破棄すること", () => {
    const store = createRealtimeRoomSyncStateStore();
    store.setLastAoiCell("room-1", "socket-1", { col: 1, row: 1 });

    store.resetRoom("room-1");

    expect(store.getLastAoiCell("room-1", "socket-1")).toBeUndefined();
  });

  it("対象ルームの可視プレイヤーIDを破棄すること", () => {
    const store = createRealtimeRoomSyncStateStore();
    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1"]);

    store.resetRoom("room-1");

    expect(store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      0,
    );
  });

  it("対象ルームの可視爆弾IDを破棄すること", () => {
    const store = createRealtimeRoomSyncStateStore();
    store.replaceVisibleBombIds("room-1", "socket-1", ["bomb-1"]);

    store.resetRoom("room-1");

    expect(store.getVisibleBombIdsSnapshot("room-1", "socket-1").size).toBe(0);
  });

  it("対象ルームの可視ハリケーンIDを破棄すること", () => {
    const store = createRealtimeRoomSyncStateStore();
    store.replaceVisibleHurricaneIds("room-1", "socket-1", ["h1"]);

    store.resetRoom("room-1");

    expect(
      store.getVisibleHurricaneIdsSnapshot("room-1", "socket-1").size,
    ).toBe(0);
  });

  it("他ルームの状態は破棄しないこと", () => {
    const store = createRealtimeRoomSyncStateStore();
    store.replaceVisiblePlayerIds("room-2", "socket-1", ["p1"]);

    store.resetRoom("room-1");

    expect(store.getVisiblePlayerIdsSnapshot("room-2", "socket-1").size).toBe(
      1,
    );
  });

  it("未登録ルームを指定しても例外を投げないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    expect(() => store.resetRoom("unknown-room")).not.toThrow();
  });
});

describe("createRealtimeRoomSyncStateStore.releaseSocket", () => {
  /** 5種のキャッシュへ値を入れたストアを生成する */
  const createStoreWithCaches = () => {
    const store = createRealtimeRoomSyncStateStore();
    store.getPlayerPositionCache("room-1", "socket-1").set("p1", { x: 1, y: 2 });
    store.setLastAoiCell("room-1", "socket-1", { col: 2, row: 3 });
    store.replaceVisiblePlayerIds("room-1", "socket-1", ["p1"]);
    store.replaceVisibleBombIds("room-1", "socket-1", ["bomb-1"]);
    store.replaceVisibleHurricaneIds("room-1", "socket-1", ["h1"]);

    return store;
  };

  it("対象ソケットの座標キャッシュを解放すること", () => {
    const store = createStoreWithCaches();

    store.releaseSocket("socket-1");

    expect(store.getPlayerPositionCache("room-1", "socket-1").size).toBe(0);
  });

  it("対象ソケットのAOI中心セルを解放すること", () => {
    const store = createStoreWithCaches();

    store.releaseSocket("socket-1");

    expect(store.getLastAoiCell("room-1", "socket-1")).toBeUndefined();
  });

  it("対象ソケットの可視プレイヤーIDを解放すること", () => {
    const store = createStoreWithCaches();

    store.releaseSocket("socket-1");

    expect(store.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      0,
    );
  });

  it("対象ソケットの可視爆弾IDを解放すること", () => {
    const store = createStoreWithCaches();

    store.releaseSocket("socket-1");

    expect(store.getVisibleBombIdsSnapshot("room-1", "socket-1").size).toBe(0);
  });

  it("対象ソケットの可視ハリケーンIDを解放すること", () => {
    const store = createStoreWithCaches();

    store.releaseSocket("socket-1");

    expect(
      store.getVisibleHurricaneIdsSnapshot("room-1", "socket-1").size,
    ).toBe(0);
  });

  it("解放後は新しいMapインスタンスを返すこと", () => {
    const store = createStoreWithCaches();
    const before = store.getPlayerPositionCache("room-1", "socket-1");

    store.releaseSocket("socket-1");

    expect(store.getPlayerPositionCache("room-1", "socket-1")).not.toBe(before);
  });

  it("対象ソケットのキャッシュを全ルームから解放すること", () => {
    const store = createStoreWithCaches();
    store.replaceVisiblePlayerIds("room-2", "socket-1", ["p2"]);

    store.releaseSocket("socket-1");

    expect(store.getVisiblePlayerIdsSnapshot("room-2", "socket-1").size).toBe(
      0,
    );
  });

  it("同一ルームの他ソケットのキャッシュは残すこと", () => {
    const store = createStoreWithCaches();
    store.replaceVisiblePlayerIds("room-1", "socket-2", ["p2"]);

    store.releaseSocket("socket-1");

    expect([
      ...store.getVisiblePlayerIdsSnapshot("room-1", "socket-2"),
    ]).toEqual(["p2"]);
  });

  it("他ルームの他ソケットのキャッシュは残すこと", () => {
    const store = createStoreWithCaches();
    store.setLastAoiCell("room-2", "socket-2", { col: 5, row: 6 });

    store.releaseSocket("socket-1");

    expect(store.getLastAoiCell("room-2", "socket-2")).toEqual({
      col: 5,
      row: 6,
    });
  });

  it("他ソケットの座標キャッシュのインスタンスを保持すること", () => {
    const store = createStoreWithCaches();
    const other = store.getPlayerPositionCache("room-1", "socket-2");

    store.releaseSocket("socket-1");

    expect(store.getPlayerPositionCache("room-1", "socket-2")).toBe(other);
  });

  it("未登録ソケットを指定しても例外を投げないこと", () => {
    const store = createStoreWithCaches();

    expect(() => store.releaseSocket("socket-unknown")).not.toThrow();
  });

  it("未登録ソケットの解放では既存キャッシュを壊さないこと", () => {
    const store = createStoreWithCaches();

    store.releaseSocket("socket-unknown");

    expect([
      ...store.getVisiblePlayerIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["p1"]);
  });

  it("同一ソケットを二度解放しても例外を投げないこと", () => {
    const store = createStoreWithCaches();
    store.releaseSocket("socket-1");

    expect(() => store.releaseSocket("socket-1")).not.toThrow();
  });

  it("空のストアに対しても例外を投げないこと", () => {
    const store = createRealtimeRoomSyncStateStore();

    expect(() => store.releaseSocket("socket-1")).not.toThrow();
  });
});

describe("createRealtimeRoomSyncStateStore", () => {
  it("生成ごとに独立した状態を持つこと", () => {
    const first = createRealtimeRoomSyncStateStore();
    const second = createRealtimeRoomSyncStateStore();

    first.replaceVisiblePlayerIds("room-1", "socket-1", ["p1"]);

    expect(second.getVisiblePlayerIdsSnapshot("room-1", "socket-1").size).toBe(
      0,
    );
  });
});
