/**
 * vitest.config
 * shared パッケージのユニットテスト設定
 * 純ロジックのみを対象とするため Node 環境で src 配下の *.test.ts を実行する
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
