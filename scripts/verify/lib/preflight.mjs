/**
 * preflight
 * 検証を始める前に前提条件（依存・ブラウザ・shared のビルド）を確認する
 * 満たさない場合は破壊的な復旧を試みず，人間が実行すべきコマンドを添えて返す
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { REPO_ROOT, SHARED_DIST_ENTRY } from "./paths.mjs";

/**
 * @typedef {{ name: string, ok: boolean, detail: string, fix?: string }} PreflightItem
 */

const INSTALL_FIX = "pnpm install（リポジトリのルートで実行）";
const CHROMIUM_FIX =
  "pnpm --filter verify-e2e exec playwright install --with-deps chromium" +
  "（システム依存の導入に sudo を使う．devcontainer の Rebuild でも導入される）";

// モジュールを読み込めるか（未インストールの検出用）
const canImport = async (specifier) => {
  try {
    await import(specifier);
    return { ok: true, detail: "読み込み可" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message.split("\n")[0] };
  }
};

const binExists = (relativeDir, bin) => {
  return existsSync(path.join(REPO_ROOT, relativeDir, "node_modules/.bin", bin));
};

/**
 * 前提条件を確認し，各項目の結果を返す
 * @returns {Promise<PreflightItem[]>}
 */
export const runPreflight = async () => {
  /** @type {PreflightItem[]} */
  const items = [];

  // ランナー自身の依存（scripts/verify の devDependencies）
  for (const specifier of ["playwright", "socket.io-client"]) {
    const result = await canImport(specifier);
    items.push({
      name: `依存パッケージ ${specifier}`,
      ...result,
      fix: result.ok ? undefined : INSTALL_FIX,
    });
  }

  // client / server を起動するための依存
  items.push({
    name: "client の依存（vite）",
    ok: binExists("apps/client", "vite"),
    detail: "apps/client/node_modules/.bin/vite",
    fix: INSTALL_FIX,
  });
  items.push({
    name: "server の依存（tsx）",
    ok: binExists("apps/server", "tsx"),
    detail: "apps/server/node_modules/.bin/tsx",
    fix: INSTALL_FIX,
  });

  // shared のビルド成果物（無いと client / server / Bot が起動できない）
  const isSharedBuilt = existsSync(SHARED_DIST_ENTRY);
  items.push({
    name: "shared のビルド",
    ok: isSharedBuilt,
    detail: path.relative(REPO_ROOT, SHARED_DIST_ENTRY),
    fix: "pnpm shared:build",
  });
  if (isSharedBuilt) {
    const result = await canImport("@repo/shared");
    items.push({
      name: "shared の読み込み",
      ...result,
      fix: result.ok ? undefined : "pnpm shared:build",
    });
  }

  // Playwright の Chromium（ブラウザ本体）
  const playwrightItem = items.find((item) => item.name.endsWith("playwright"));
  if (playwrightItem?.ok) {
    const { chromium } = await import("playwright");
    const executablePath = chromium.executablePath();
    items.push({
      name: "Playwright の Chromium",
      ok: existsSync(executablePath),
      detail: executablePath,
      fix: CHROMIUM_FIX,
    });
  }

  return items;
};

/** Chromium の起動失敗（システム依存の不足等）時に案内するコマンド */
export const CHROMIUM_INSTALL_HINT = CHROMIUM_FIX;
