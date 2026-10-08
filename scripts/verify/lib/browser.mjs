/**
 * browser
 * ガード付きの Chromium を起動し，ページ上の問題（コンソールエラー等）とブロックした通信を記録する
 * 許可リスト外への HTTP・WebSocket は Playwright の route でブロックする
 */
import { chromium } from "playwright";

import { checkUrl } from "./guard.mjs";
import { CHROMIUM_INSTALL_HINT } from "./preflight.mjs";

/** 検証で使う画面サイズ（横画面専用ゲームのため既定は横長） */
export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  // スマホ横画面相当．スマホ判定のゲートを通すため URL に ?allowBrowser=1 を付けて開く
  mobileLandscape: { width: 844, height: 390 },
};

/**
 * @typedef {{
 *   problems: string[],
 *   blockedRequests: { url: string, reason: string }[],
 * }} BrowserIssues
 */

/**
 * ガード付きのブラウザを起動する
 * @param {{ viewport?: { width: number, height: number }, issues: BrowserIssues }} params
 */
export const launchGuardedBrowser = async ({ viewport = VIEWPORTS.desktop, issues }) => {
  let browser;
  try {
    // headless-shell ではなく通常の Chromium（新ヘッドレス）を使い，前提確認（executablePath）と対象を揃える
    browser = await chromium.launch({ headless: true, channel: "chromium" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Chromium を起動できません（システム依存の不足等）: ${message.split("\n")[0]}\n` +
        `導入コマンド: ${CHROMIUM_INSTALL_HINT}`,
    );
  }

  const context = await browser.newContext({
    viewport,
    locale: "ja-JP",
    // Service Worker 経由の通信は route を通らないため無効化する
    serviceWorkers: "block",
  });

  // 許可リスト外の HTTP(S) はブロックして記録する（許可された通信は経路に介入しない）
  await context.route(
    (url) => !checkUrl(url.href).allowed,
    async (route) => {
      const url = route.request().url();
      issues.blockedRequests.push({ url, reason: checkUrl(url).reason });
      await route.abort("blockedbyclient");
    },
  );

  // 許可リスト外の WebSocket はサーバーへ繋がずに閉じる
  await context.routeWebSocket(
    (url) => !checkUrl(url.href).allowed,
    (webSocket) => {
      const url = webSocket.url();
      issues.blockedRequests.push({ url, reason: checkUrl(url).reason });
      webSocket.close({ code: 1008, reason: "blocked by verify guard" });
    },
  );

  return { browser, context };
};

/**
 * ページ上の問題（コンソールエラー・未捕捉例外・HTTP 4xx/5xx）を記録する
 * @param {import("playwright").Page} page
 * @param {BrowserIssues} issues
 * @param {string} label 複数ページを区別するための名前
 */
export const attachProblemCollectors = (page, issues, label) => {
  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.problems.push(`[${label}] console.error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    issues.problems.push(`[${label}] pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      issues.problems.push(
        `[${label}] http ${response.status()}: ${response.request().method()} ${response.url()}`,
      );
    }
  });
};
