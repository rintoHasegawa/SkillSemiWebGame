/**
 * vitest.setup
 * node 環境で pixi.js を読み込むための最小グローバル補完を行う
 * pixi.js がモジュール初期化時に navigator.userAgent を参照するため補う
 */

if (!("navigator" in globalThis)) {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "node" },
    configurable: true,
    writable: true,
  });
}
