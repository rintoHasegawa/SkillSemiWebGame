/**
 * check-debug-hook-excluded
 * クライアントの本番ビルド（apps/client/dist）にデバッグフックが含まれていないことを確認する
 *
 *   pnpm --filter client build && pnpm verify:no-debug-hook
 *
 * デバッグフックの公開名（DEBUG_HOOK_GLOBAL_KEY）が成果物の JS に 1 件でもあれば終了コード 1 で失敗する
 * dist が無い場合は終了コード 2（ビルドしてから実行する）
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { readDebugHookKey } from "./lib/debugHookKey.mjs";
import { REPO_ROOT } from "./lib/paths.mjs";

const DIST_DIR = path.join(REPO_ROOT, "apps/client/dist");

// dist 配下の JS を再帰的に列挙する
const listJsFiles = (dir) => {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return listJsFiles(fullPath);
    }
    return fullPath.endsWith(".js") ? [fullPath] : [];
  });
};

if (!existsSync(DIST_DIR)) {
  console.error(`${path.relative(REPO_ROOT, DIST_DIR)} がありません．先に pnpm --filter client build を実行してください`);
  process.exit(2);
}

const key = readDebugHookKey();
const files = listJsFiles(DIST_DIR);
const leaked = files.filter((file) => readFileSync(file, "utf8").includes(key));

if (leaked.length > 0) {
  console.error(`本番ビルドにデバッグフック（${key}）が含まれています:`);
  for (const file of leaked) console.error(`  ${path.relative(REPO_ROOT, file)}`);
  process.exit(1);
}

console.log(`OK: 本番ビルド（JS ${files.length} 件）にデバッグフック（${key}）は含まれていません`);
