/**
 * vitest.config
 * client パッケージのユニットテスト設定
 * tsconfig の paths（@client/*）と workspace 参照（@repo/shared）を解決する
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const sharedSrcEntry = fileURLToPath(
  new URL("../../packages/shared/src/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: [
      // tsconfig / vite.config の paths（"@client/*": ["src/*"]）と同じ解決を行う
      { find: /^@client\//, replacement: `${srcDir}/` },
      { find: /^@client$/, replacement: srcDir },
      // ビルド成果物（dist）ではなくソースを参照し，事前ビルド不要にする
      { find: /^@repo\/shared$/, replacement: sharedSrcEntry },
    ],
  },
  test: {
    // DOM 依存のテストは書かない方針のため node 環境で実行する
    environment: "node",
    // pixi.js の読み込みに必要な最小グローバルのみ補完する
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
