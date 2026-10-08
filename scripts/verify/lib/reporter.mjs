/**
 * reporter
 * シナリオのチェック結果を記録し，スクリーンショットと result.json を出力する
 * 1 つのチェックが失敗しても例外を外へ出さず，次のチェックへ進めるようにする
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

/**
 * @typedef {{
 *   name: string,
 *   status: "PASS" | "FAIL",
 *   durationMs: number,
 *   error?: string,
 *   screenshot: string | null,
 * }} CheckResult
 */

/**
 * 条件が偽なら例外を投げる（チェック内の判定に使う）
 * @param {unknown} condition
 * @param {string} message
 * @returns {asserts condition}
 */
export const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

// ファイル名に使えない文字を置き換える
const toFileLabel = (text) => text.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);

/**
 * チェック結果を集計するレポーターを生成する
 * @param {{ outDir: string, getDefaultPage: () => import("playwright").Page | null }} params
 */
export const createReporter = ({ outDir, getDefaultPage }) => {
  /** @type {CheckResult[]} */
  const results = [];
  /** @type {string[]} */
  const notes = [];
  let shotCount = 0;

  /**
   * スクリーンショットを撮り，出力先からの相対パスを返す
   * @param {string} label
   * @param {import("playwright").Page | null} [page]
   */
  const screenshot = async (label, page = getDefaultPage()) => {
    if (!page || page.isClosed()) {
      return null;
    }
    shotCount += 1;
    const fileName = `${String(shotCount).padStart(2, "0")}-${toFileLabel(label)}.png`;
    await page.screenshot({ path: path.join(outDir, fileName) });
    return fileName;
  };

  /**
   * チェックを 1 件実行して記録する（失敗しても例外を外へ出さない）
   * @param {string} name 何がどうなるべきかが分かる名前
   * @param {() => Promise<unknown> | unknown} fn 失敗時に例外を投げる判定処理
   * @param {{ page?: import("playwright").Page | null, screenshot?: boolean }} [options]
   *   page に null を渡すか screenshot: false で画面を伴わないチェックになる
   * @returns {Promise<boolean>} PASS なら true
   */
  const check = async (name, fn, options = {}) => {
    const page = options.page === undefined ? getDefaultPage() : options.page;
    const shouldShoot = options.screenshot !== false;
    const startedAt = Date.now();
    try {
      await fn();
      const shot = shouldShoot ? await screenshot(`pass-${name}`, page).catch(() => null) : null;
      results.push({ name, status: "PASS", durationMs: Date.now() - startedAt, screenshot: shot });
      console.error(`  PASS ${name}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // 失敗時は判定に関わらず証拠を残す
      const shot = page ? await screenshot(`fail-${name}`, page).catch(() => null) : null;
      results.push({
        name,
        status: "FAIL",
        durationMs: Date.now() - startedAt,
        error: message.split("\n")[0],
        screenshot: shot,
      });
      console.error(`  FAIL ${name}: ${message.split("\n")[0]}`);
      return false;
    }
  };

  /**
   * 判定ではない補足情報（観測値など）を記録する
   * @param {string} message
   */
  const note = (message) => {
    notes.push(message);
    console.error(`  NOTE ${message}`);
  };

  /**
   * result.json を書き出す
   * @param {Record<string, unknown>} extra 実行情報（環境・後始末・ページの問題等）
   */
  const writeResult = (extra) => {
    const failCount = results.filter((result) => result.status === "FAIL").length;
    const passCount = results.length - failCount;
    const summary = {
      ...extra,
      counts: { pass: passCount, fail: failCount },
      results,
      notes,
    };
    writeFileSync(path.join(outDir, "result.json"), `${JSON.stringify(summary, null, 2)}\n`);
    return { passCount, failCount };
  };

  return { check, screenshot, note, writeResult, results };
};
