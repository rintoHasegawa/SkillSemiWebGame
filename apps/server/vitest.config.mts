/**
 * vitest.config
 * server パッケージのユニットテスト設定
 * tsconfig の paths（@server/*）と workspace 参照（@repo/shared）を解決する
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
      // tsconfig の paths（"@server/*": ["src/*"]）と同じ解決を行う
      { find: /^@server\//, replacement: `${srcDir}/` },
      // ビルド成果物（dist）ではなくソースを参照し，事前ビルド不要にする
      { find: /^@repo\/shared$/, replacement: sharedSrcEntry },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
