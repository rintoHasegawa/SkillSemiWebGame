/**
 * DisposableRegistry.test
 * 破棄処理レジストリの現行挙動を固定する characterization test
 * 逆順実行・登録解除・多重実行時の扱いを検証する
 */
import { describe, expect, it } from "vitest";

import { DisposableRegistry } from "./DisposableRegistry";

describe("DisposableRegistry", () => {
  it("登録が無い場合の一括実行で例外を投げないこと", () => {
    const registry = new DisposableRegistry();

    expect(() => registry.disposeAll()).not.toThrow();
  });

  it("登録した破棄処理を実行すること", () => {
    const registry = new DisposableRegistry();
    const calls: string[] = [];
    registry.add(() => calls.push("a"));

    registry.disposeAll();

    expect(calls).toEqual(["a"]);
  });

  it("登録順の逆順で破棄処理を実行すること", () => {
    const registry = new DisposableRegistry();
    const calls: string[] = [];
    registry.add(() => calls.push("a"));
    registry.add(() => calls.push("b"));
    registry.add(() => calls.push("c"));

    registry.disposeAll();

    expect(calls).toEqual(["c", "b", "a"]);
  });

  it("一括実行後は登録が空になること", () => {
    const registry = new DisposableRegistry();
    const calls: string[] = [];
    registry.add(() => calls.push("a"));

    registry.disposeAll();
    registry.disposeAll();

    expect(calls).toEqual(["a"]);
  });

  it("登録解除した破棄処理は実行しないこと", () => {
    const registry = new DisposableRegistry();
    const calls: string[] = [];
    const unregister = registry.add(() => calls.push("a"));
    registry.add(() => calls.push("b"));

    unregister();
    registry.disposeAll();

    expect(calls).toEqual(["b"]);
  });

  it("同一関数を複数回登録した場合の登録解除は同一参照をすべて外すこと", () => {
    const registry = new DisposableRegistry();
    const calls: string[] = [];
    const disposer = () => calls.push("a");
    const unregister = registry.add(disposer);
    registry.add(disposer);

    unregister();
    registry.disposeAll();

    expect(calls).toEqual([]);
  });

  it("クリアでは破棄処理を実行せず登録のみ消すこと", () => {
    const registry = new DisposableRegistry();
    const calls: string[] = [];
    registry.add(() => calls.push("a"));

    registry.clear();
    registry.disposeAll();

    expect(calls).toEqual([]);
  });

  it("クリア後も新しい破棄処理を登録できること", () => {
    const registry = new DisposableRegistry();
    const calls: string[] = [];
    registry.clear();
    registry.add(() => calls.push("b"));

    registry.disposeAll();

    expect(calls).toEqual(["b"]);
  });
});
