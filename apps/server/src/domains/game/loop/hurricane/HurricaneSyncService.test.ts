/**
 * HurricaneSyncService.test
 * ハリケーン同期ペイロード生成の現行挙動を固定する characterization test
 * 初回全量同期・量子化・差分抽出・初期化の境界挙動を検証する
 */
import { describe, expect, it } from "vitest";

import { HurricaneSyncService } from "./HurricaneSyncService";
import type { HurricaneState } from "./hurricaneTypes";

/** テスト用のハリケーン状態を生成する */
const createHurricane = (
  overrides: Partial<HurricaneState> = {},
): HurricaneState => {
  return {
    id: "hurricane-1",
    x: 1,
    y: 2,
    vx: 0,
    vy: 0,
    radius: 1.1,
    rotationRad: 0,
    ...overrides,
  };
};

describe("HurricaneSyncService.consumeSyncOutputs", () => {
  it("初回同期がマークされていない場合はcurrentUpdatesを空にすること", () => {
    const service = new HurricaneSyncService();

    const outputs = service.consumeSyncOutputs(0, [createHurricane()]);

    expect(outputs.currentUpdates).toEqual([]);
  });

  it("前回送信状態がない場合はupdateUpdatesへ全ハリケーンを含めること", () => {
    const service = new HurricaneSyncService();

    const outputs = service.consumeSyncOutputs(0, [
      createHurricane({ id: "hurricane-1" }),
      createHurricane({ id: "hurricane-2" }),
    ]);

    expect(outputs.updateUpdates.map((entry) => entry.id)).toEqual([
      "hurricane-1",
      "hurricane-2",
    ]);
  });

  it("ハリケーンが空の場合は両方の配列を空にすること", () => {
    const service = new HurricaneSyncService();

    const outputs = service.consumeSyncOutputs(0, []);

    expect(outputs).toEqual({ currentUpdates: [], updateUpdates: [] });
  });

  it("量子化後の値を含むペイロードのみを返すこと", () => {
    const service = new HurricaneSyncService();

    const outputs = service.consumeSyncOutputs(0, [
      createHurricane({ x: 1.234, y: 2.987, radius: 1.16, rotationRad: 0.3 }),
    ]);

    expect(outputs.updateUpdates).toEqual([
      {
        id: "hurricane-1",
        x: 1.2,
        y: 3,
        radius: 1.2,
        rotationRad: 0.25,
      },
    ]);
  });

  it("回転角を0.25刻みへ量子化すること", () => {
    const service = new HurricaneSyncService();

    const outputs = service.consumeSyncOutputs(0, [
      createHurricane({ rotationRad: 0.4 }),
    ]);

    expect(outputs.updateUpdates[0]?.rotationRad).toBe(0.5);
  });

  it("負の座標は上位側へ丸めて量子化すること", () => {
    const service = new HurricaneSyncService();

    const outputs = service.consumeSyncOutputs(0, [
      createHurricane({ x: -1.25 }),
    ]);

    expect(outputs.updateUpdates[0]?.x).toBe(-1.2);
  });

  it("量子化後の値が変化しない場合はupdateUpdatesへ含めないこと", () => {
    const service = new HurricaneSyncService();
    service.consumeSyncOutputs(0, [createHurricane({ x: 1 })]);

    const outputs = service.consumeSyncOutputs(50, [
      createHurricane({ x: 1.02 }),
    ]);

    expect(outputs.updateUpdates).toEqual([]);
  });

  it("量子化後の値が変化した場合はupdateUpdatesへ含めること", () => {
    const service = new HurricaneSyncService();
    service.consumeSyncOutputs(0, [createHurricane({ x: 1 })]);

    const outputs = service.consumeSyncOutputs(50, [
      createHurricane({ x: 1.2 }),
    ]);

    expect(outputs.updateUpdates[0]?.x).toBe(1.2);
  });

  it("変化したハリケーンのみをupdateUpdatesへ含めること", () => {
    const service = new HurricaneSyncService();
    service.consumeSyncOutputs(0, [
      createHurricane({ id: "hurricane-1", x: 1 }),
      createHurricane({ id: "hurricane-2", x: 2 }),
    ]);

    const outputs = service.consumeSyncOutputs(50, [
      createHurricane({ id: "hurricane-1", x: 1 }),
      createHurricane({ id: "hurricane-2", x: 3 }),
    ]);

    expect(outputs.updateUpdates.map((entry) => entry.id)).toEqual([
      "hurricane-2",
    ]);
  });

  it("経過時間の値は出力に影響しないこと", () => {
    const first = new HurricaneSyncService();
    const second = new HurricaneSyncService();
    const hurricane = createHurricane();

    expect(first.consumeSyncOutputs(0, [hurricane])).toEqual(
      second.consumeSyncOutputs(120000, [hurricane]),
    );
  });
});

describe("HurricaneSyncService.markInitialSyncPending", () => {
  it("マーク後の呼び出しでcurrentUpdatesへ全ハリケーンを返すこと", () => {
    const service = new HurricaneSyncService();
    service.markInitialSyncPending();

    const outputs = service.consumeSyncOutputs(0, [
      createHurricane({ id: "hurricane-1" }),
      createHurricane({ id: "hurricane-2" }),
    ]);

    expect(outputs.currentUpdates.map((entry) => entry.id)).toEqual([
      "hurricane-1",
      "hurricane-2",
    ]);
  });

  it("初回全量同期を返した呼び出しではupdateUpdatesを空にすること", () => {
    const service = new HurricaneSyncService();
    service.markInitialSyncPending();

    const outputs = service.consumeSyncOutputs(0, [createHurricane()]);

    expect(outputs.updateUpdates).toEqual([]);
  });

  it("初回全量同期は1回のみ返すこと", () => {
    const service = new HurricaneSyncService();
    service.markInitialSyncPending();
    service.consumeSyncOutputs(0, [createHurricane()]);

    const outputs = service.consumeSyncOutputs(50, [createHurricane()]);

    expect(outputs.currentUpdates).toEqual([]);
  });

  it("ハリケーンが空の呼び出しでは初回同期マークを消費しないこと", () => {
    const service = new HurricaneSyncService();
    service.markInitialSyncPending();
    service.consumeSyncOutputs(0, []);

    const outputs = service.consumeSyncOutputs(50, [createHurricane()]);

    expect(outputs.currentUpdates.map((entry) => entry.id)).toEqual([
      "hurricane-1",
    ]);
  });

  it("currentUpdatesも量子化済みの値を返すこと", () => {
    const service = new HurricaneSyncService();
    service.markInitialSyncPending();

    const outputs = service.consumeSyncOutputs(0, [
      createHurricane({ x: 1.234, y: 2.987, radius: 1.16, rotationRad: 0.3 }),
    ]);

    expect(outputs.currentUpdates).toEqual([
      {
        id: "hurricane-1",
        x: 1.2,
        y: 3,
        radius: 1.2,
        rotationRad: 0.25,
      },
    ]);
  });
});

describe("HurricaneSyncService.clear", () => {
  it("送信済みスナップショットを破棄して全ハリケーンを再送対象にすること", () => {
    const service = new HurricaneSyncService();
    service.consumeSyncOutputs(0, [createHurricane()]);

    service.clear();
    const outputs = service.consumeSyncOutputs(50, [createHurricane()]);

    expect(outputs.updateUpdates.map((entry) => entry.id)).toEqual([
      "hurricane-1",
    ]);
  });

  it("初回同期マークを解除すること", () => {
    const service = new HurricaneSyncService();
    service.markInitialSyncPending();

    service.clear();
    const outputs = service.consumeSyncOutputs(0, [createHurricane()]);

    expect(outputs.currentUpdates).toEqual([]);
  });

  it("初期状態で呼んでも例外を投げないこと", () => {
    const service = new HurricaneSyncService();

    expect(() => service.clear()).not.toThrow();
  });
});
