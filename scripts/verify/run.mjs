/**
 * run
 * 自動動作確認（/verify）のシナリオランナー
 *
 *   pnpm verify:e2e <シナリオ.mjs> [--game-duration-sec <秒>] [--timeout-sec <秒>] [--dry-run]
 *   （= node scripts/verify/run.mjs <シナリオ.mjs> ...）
 *
 * 試合時間はシナリオの `export const options = { gameDurationSec: 30 }` で宣言でき，
 * CLI の --game-duration-sec が優先する．ランナーが server を起動する場合だけ
 * 環境変数 DEV_GAME_DURATION_SEC として渡す（起動済みの server には適用できないため警告する）
 *
 * 1. 前提条件（依存・Chromium・shared のビルド）を確認し，満たさなければ終了コード 2 で終了する
 * 2. ローカルの server（:3000）・client（:5173）を用意する．応答済みなら使うだけ，無ければ起動する
 * 3. ガード付きの Chromium と Bot プールを用意し，シナリオ（default export の関数）へ渡して実行する
 * 4. 成否に関わらず Bot の切断・ブラウザの終了・自分が起動したプロセスの停止を行い，result.json を書く
 *
 * 出力先は実行ごとに run-<日時>/ を作る（前回の証拠を上書きしない）
 *   - シナリオが .verify/ 配下: <シナリオのディレクトリ>/run-<日時>/
 *   - それ以外（scripts/verify/scenarios/ 等）: .verify/_scenarios/<シナリオ名>/run-<日時>/
 * 終了コード: 0 = PASS / 1 = FAIL・ERROR（結果は result.json）/ 2 = 前提未充足・引数誤り
 */
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { CLIENT_URL, SERVER_URL } from "./lib/guard.mjs";
import { formatRunStamp, REPO_ROOT, resolveRunOutDir } from "./lib/paths.mjs";
import { runPreflight } from "./lib/preflight.mjs";

const DEFAULT_TIMEOUT_SEC = 600;
const EXIT_PASS = 0;
const EXIT_FAIL = 1;
const EXIT_PRECONDITION = 2;

const usage = () => {
  console.error(
    "usage: pnpm verify:e2e <シナリオ.mjs> [--game-duration-sec <秒>] [--timeout-sec <秒>] [--dry-run]",
  );
};

/** server へ試合時間を渡す環境変数名（apps/server/src/config/gameDurationOverride.ts と同じ） */
const GAME_DURATION_ENV_KEY = "DEV_GAME_DURATION_SEC";

/**
 * 例外の内容を表示用の文字列にする
 * @param {unknown} error
 */
const toErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

/**
 * @param {string} message
 * @returns {never}
 */
const exitPrecondition = (message) => {
  console.error(`\n[verify] 検証不能: ${message}`);
  process.exit(EXIT_PRECONDITION);
};

// ---- 引数の解釈 ----
const VALUE_FLAGS = new Set(["--timeout-sec", "--game-duration-sec"]);
const argv = process.argv.slice(2);
/** @type {Map<string, string>} */
const flagValues = new Map();
/** @type {string[]} */
const positional = [];
let isDryRun = false;
for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (arg === "--dry-run") {
    isDryRun = true;
  } else if (VALUE_FLAGS.has(arg)) {
    flagValues.set(arg, argv[index + 1] ?? "");
    index += 1;
  } else if (arg.startsWith("--")) {
    console.error(`不明なオプション: ${arg}`);
    usage();
    process.exit(EXIT_PRECONDITION);
  } else {
    positional.push(arg);
  }
}

// server（apps/server/src/config/gameDurationOverride.ts）と同じく十進の整数表記だけを受け付ける
// （前後空白・"0x1e"・"3e1"・"30.0" 等は拒否する）
const DECIMAL_INTEGER_PATTERN = /^\d+$/;
const parseDecimalInteger = (raw) => (DECIMAL_INTEGER_PATTERN.test(raw) ? Number(raw) : null);

const rawTimeoutSec = flagValues.get("--timeout-sec") ?? null;
const parsedTimeoutSec =
  rawTimeoutSec === null ? DEFAULT_TIMEOUT_SEC : parseDecimalInteger(rawTimeoutSec);
const rawCliGameDurationSec = flagValues.get("--game-duration-sec") ?? null;
const cliGameDurationSec =
  rawCliGameDurationSec === null ? null : parseDecimalInteger(rawCliGameDurationSec);

if (positional.length !== 1) {
  usage();
  process.exit(EXIT_PRECONDITION);
}
if (parsedTimeoutSec === null || parsedTimeoutSec <= 0) {
  exitPrecondition(`--timeout-sec の値が不正です: "${rawTimeoutSec}"（1 以上の整数秒）`);
}
const timeoutSec = parsedTimeoutSec;

// pnpm 経由ではカレントがルートになるため，相対パスは呼び出し元（INIT_CWD）基準でも解決を試みる
const resolveScenarioPath = (input) => {
  const candidates = [path.resolve(process.cwd(), input)];
  if (process.env.INIT_CWD) {
    candidates.push(path.resolve(process.env.INIT_CWD, input));
  }
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

const scenarioPath = resolveScenarioPath(positional[0]);
if (!existsSync(scenarioPath) || !statSync(scenarioPath).isFile()) {
  exitPrecondition(`シナリオが見つかりません: ${scenarioPath}`);
}
if (!scenarioPath.endsWith(".mjs")) {
  exitPrecondition(`シナリオは .mjs（ESM）で書いてください: ${scenarioPath}`);
}

// ---- 出力先（実行ごとに別ディレクトリ） ----
const stamp = formatRunStamp(new Date());
const outDir = resolveRunOutDir({ scenarioPath, stamp });
const relative = (target) => path.relative(REPO_ROOT, target);

// ---- シナリオの読み込みと試合時間の決定（サービス起動前・--dry-run でも検証する） ----
/** @type {typeof import("@repo/shared").config} */
let sharedConfig;
try {
  ({ config: sharedConfig } = await import("@repo/shared"));
} catch (error) {
  exitPrecondition(
    `shared を読み込めません（${toErrorMessage(error).split("\n")[0]}）．` +
      "実行するコマンド: pnpm install / pnpm shared:build",
  );
}
/** @type {any} */
let scenarioModule;
try {
  scenarioModule = await import(pathToFileURL(scenarioPath).href);
} catch (error) {
  exitPrecondition(`シナリオを読み込めません: ${toErrorMessage(error)}`);
}
if (typeof scenarioModule.default !== "function") {
  exitPrecondition("シナリオは default export で async 関数（ctx を受け取る）を公開してください");
}

const durationRangeText =
  `${sharedConfig.MIN_GAME_DURATION_OVERRIDE_SEC}〜${sharedConfig.GAME_CONFIG.GAME_DURATION_SEC} の整数秒`;

// CLI の値は文字列のため，整数表記かと範囲を検証する
if (rawCliGameDurationSec !== null) {
  if (cliGameDurationSec === null || !sharedConfig.isValidGameDurationOverrideSec(cliGameDurationSec)) {
    exitPrecondition(`--game-duration-sec の値が不正です: "${rawCliGameDurationSec}"（${durationRangeText}）`);
  }
}

// シナリオの options は数値で書く（文字列は型の誤りとして明示する）
/** @type {unknown} */
const rawScenarioGameDurationSec = scenarioModule.options?.gameDurationSec ?? null;
if (rawScenarioGameDurationSec !== null) {
  if (typeof rawScenarioGameDurationSec !== "number") {
    const shown =
      typeof rawScenarioGameDurationSec === "string"
        ? `文字列 "${rawScenarioGameDurationSec}"`
        : `${typeof rawScenarioGameDurationSec} 型の値`;
    exitPrecondition(
      `シナリオの options.gameDurationSec は数値で指定してください（${shown} が指定されています）`,
    );
  }
  if (!sharedConfig.isValidGameDurationOverrideSec(rawScenarioGameDurationSec)) {
    exitPrecondition(
      `シナリオの options.gameDurationSec が不正です: ${rawScenarioGameDurationSec}（${durationRangeText}）`,
    );
  }
}
const scenarioGameDurationSec = /** @type {number | null} */ (rawScenarioGameDurationSec);
const requestedGameDurationSec = cliGameDurationSec ?? scenarioGameDurationSec;
/** @type {"cli" | "scenario" | null} */
const gameDurationSource =
  cliGameDurationSec !== null ? "cli" : scenarioGameDurationSec !== null ? "scenario" : null;

if (isDryRun) {
  console.error(
    JSON.stringify(
      {
        scenario: relative(scenarioPath),
        outDir: relative(outDir),
        clientUrl: CLIENT_URL,
        serverUrl: SERVER_URL,
        timeoutSec,
        gameDuration: {
          requestedSec: requestedGameDurationSec,
          source: gameDurationSource,
        },
      },
      null,
      2,
    ),
  );
  process.exit(EXIT_PASS);
}

// ---- 前提条件 ----
console.error("[verify] 前提条件を確認します");
const preflight = await runPreflight();
for (const item of preflight) {
  console.error(`  ${item.ok ? "OK " : "NG "} ${item.name}（${item.detail}）`);
}
const unmet = preflight.filter((item) => !item.ok);
if (unmet.length > 0) {
  exitPrecondition(
    unmet.map((item) => `${item.name} が未充足．実行するコマンド: ${item.fix ?? "-"}`).join("\n  "),
  );
}

// 依存が揃ったことを確認してから読み込む（未インストール時に分かりにくいエラーで落ちないように）
const { ensureService, stopService, killServicesSync } = await import("./lib/services.mjs");
const { launchGuardedBrowser, attachProblemCollectors, VIEWPORTS } = await import("./lib/browser.mjs");
const { createBotPool } = await import("./lib/bots.mjs");
const { createGameHelpers } = await import("./lib/game.mjs");
const { createReporter, assert } = await import("./lib/reporter.mjs");

mkdirSync(outDir, { recursive: true });
console.error(`[verify] シナリオ: ${relative(scenarioPath)}`);
console.error(`[verify] 出力先: ${relative(outDir)}`);

/** @type {import("./lib/services.mjs").ServiceHandle[]} */
const services = [];
/** @type {{ problems: string[], blockedRequests: { url: string, reason: string }[] }} */
const issues = { problems: [], blockedRequests: [] };
/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];
/**
 * 試合時間の扱い（ctx.gameDuration としてシナリオへ渡し，result.json にも残す）
 * status: default = 指定なし / applied = ランナーが起動した server に適用 /
 *         not_applied_server_prestarted = 起動済みの server を使うため適用できない
 * @type {{ requestedSec: number | null, source: "cli" | "scenario" | null, status: "default" | "applied" | "not_applied_server_prestarted", expectedSec: number }}
 */
const gameDuration = {
  requestedSec: requestedGameDurationSec,
  source: gameDurationSource,
  status: "default",
  expectedSec: sharedConfig.GAME_CONFIG.GAME_DURATION_SEC,
};
/** @type {import("playwright").Browser | null} */
let browser = null;
/** @type {import("playwright").Page | null} */
let page = null;
let botPool = null;
/** @type {() => number | null} */
let observeGameDuration = () => null;
let isCleanedUp = false;
const startedAtMs = Date.now();

const reporter = createReporter({ outDir, getDefaultPage: () => page });

// 成否・中断に関わらず必ず呼ぶ後始末（Bot → ブラウザ → 自分が起動したプロセスの順）
const cleanup = async () => {
  if (isCleanedUp) return [];
  isCleanedUp = true;
  const cleanupLog = [];

  try {
    botPool?.disconnectAll();
    cleanupLog.push("Bot: 全て切断");
  } catch (error) {
    cleanupLog.push(`Bot: 切断に失敗（${String(error)}）`);
  }

  try {
    await browser?.close();
    cleanupLog.push("ブラウザ: 終了");
  } catch (error) {
    cleanupLog.push(`ブラウザ: 終了に失敗（${String(error)}）`);
  }

  for (const service of [...services].reverse()) {
    const outcome = await stopService(service);
    cleanupLog.push(
      service.startedByRunner
        ? `${service.name}: ランナーが起動したため停止（${outcome}，PID ${service.pid}）`
        : `${service.name}: 起動済みのものを使用したため停止しない`,
    );
  }

  return cleanupLog;
};

// 中断（Ctrl+C・タイムアウトによる kill）でも自分が起動したプロセスを残さない
let isInterrupted = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (isInterrupted) return;
    isInterrupted = true;
    console.error(`\n[verify] ${signal} を受信したため後始末して終了します`);
    void cleanup().finally(() => process.exit(EXIT_FAIL));
  });
}
process.on("exit", () => {
  killServicesSync(services);
});

/** @type {"PASS" | "FAIL" | "ERROR"} */
let status = "ERROR";
let cleanupLog = [];

try {
  // ---- サービスの用意（server → client） ----
  for (const name of /** @type {const} */ (["server", "client"])) {
    try {
      // 試合時間の指定が無ければ，親シェルの環境変数も引き継がず既定の試合時間で起動する
      const extraEnv =
        name === "server"
          ? { [GAME_DURATION_ENV_KEY]: requestedGameDurationSec === null ? undefined : String(requestedGameDurationSec) }
          : {};
      const handle = await ensureService({ name, logPath: path.join(outDir, `${name}.log`), extraEnv });
      services.push(handle);
      if (name === "server" && requestedGameDurationSec !== null) {
        if (handle.startedByRunner) {
          gameDuration.status = "applied";
          gameDuration.expectedSec = requestedGameDurationSec;
          console.error(`[verify] 試合時間: ${requestedGameDurationSec} 秒（${GAME_DURATION_ENV_KEY} で server に適用）`);
        } else {
          gameDuration.status = "not_applied_server_prestarted";
          const message =
            `指定した試合時間（${requestedGameDurationSec} 秒）を適用できません（起動済みの server を使うため）．` +
            "実際の試合時間はデバッグフックから取得し，待ち時間に反映します";
          warnings.push(message);
          console.error(`[verify] 警告: ${message}`);
        }
      }
      console.error(
        `[verify] ${name}: ${handle.startedByRunner ? `起動しました（PID ${handle.pid}）` : "起動済みのものを使用します"}`,
      );
    } catch (error) {
      const handle = /** @type {{ handle?: import("./lib/services.mjs").ServiceHandle }} */ (error).handle;
      if (handle) services.push(handle);
      throw error;
    }
  }

  // ---- ブラウザ・Bot・ヘルパー ----
  const launched = await launchGuardedBrowser({ issues });
  browser = launched.browser;
  page = await launched.context.newPage();
  attachProblemCollectors(page, issues, "player");
  botPool = createBotPool();
  const game = createGameHelpers(page, { expectedGameDurationSec: gameDuration.expectedSec });
  observeGameDuration = game.getObservedGameDurationSec;

  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const context = {
    page,
    browserContext: launched.context,
    clientUrl: CLIENT_URL,
    serverUrl: SERVER_URL,
    outDir,
    viewports: VIEWPORTS,
    check: reporter.check,
    screenshot: reporter.screenshot,
    note: reporter.note,
    assert,
    game,
    bots: botPool,
    /** 検証用のルーム ID（verify- 始まり・32 文字以内） */
    roomId: `verify-${stamp.slice(4)}-${randomSuffix}`,
    /** 検証用のプレイヤー名を作る（verify- 始まり） */
    playerName: (label = "player") => `verify-${label}`.slice(0, 32),
    /** 試合時間の扱い（実際の値はゲーム画面のスナップショットの game.gameDurationSec が正） */
    gameDuration: { ...gameDuration },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };

  // ---- シナリオの実行 ----
  console.error("[verify] シナリオを実行します");
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`シナリオが ${timeoutSec} 秒以内に終わりませんでした`)),
      timeoutSec * 1000,
    );
  });
  try {
    await Promise.race([scenarioModule.default(context), timeout]);
  } finally {
    clearTimeout(timer);
  }

  const failCount = reporter.results.filter((result) => result.status === "FAIL").length;
  if (reporter.results.length === 0) {
    errors.push("チェックが 1 件も記録されていません（ctx.check を使ってください）");
    status = "ERROR";
  } else {
    status = failCount > 0 ? "FAIL" : "PASS";
  }
} catch (error) {
  const message = toErrorMessage(error);
  errors.push(message);
  console.error(`[verify] ERROR: ${message}`);
  // 途中で落ちた時点の画面を証拠として残す
  await reporter.screenshot("error").catch(() => null);
  status = "ERROR";
} finally {
  cleanupLog = await cleanup();
}

const botSummary = botPool?.summarize() ?? [];
const observedGameDurationSec = observeGameDuration();
if (
  gameDuration.status === "applied" &&
  observedGameDurationSec !== null &&
  observedGameDurationSec !== gameDuration.requestedSec
) {
  warnings.push(
    `試合時間を ${gameDuration.requestedSec} 秒に指定しましたが，実際は ${observedGameDurationSec} 秒でした`,
  );
}
const { passCount, failCount } = reporter.writeResult({
  status,
  scenario: relative(scenarioPath),
  outDir: relative(outDir),
  startedAt: new Date(startedAtMs).toISOString(),
  durationMs: Date.now() - startedAtMs,
  env: {
    clientUrl: CLIENT_URL,
    serverUrl: SERVER_URL,
    services: services.map((service) => ({
      name: service.name,
      startedByRunner: service.startedByRunner,
      log: service.logPath ? relative(service.logPath) : null,
    })),
  },
  gameDuration: { ...gameDuration, observedSec: observedGameDurationSec },
  errors,
  warnings,
  problems: issues.problems,
  blockedRequests: issues.blockedRequests,
  bots: botSummary,
  cleanup: cleanupLog,
});

console.error(`\n[verify] ${status}: PASS ${passCount} / FAIL ${failCount}`);
console.error(
  `[verify] 試合時間: ${observedGameDurationSec ?? "未観測"} 秒（指定 ${gameDuration.requestedSec ?? "なし"}・${gameDuration.status}）`,
);
for (const warning of warnings) console.error(`[verify] 警告: ${warning}`);
for (const line of cleanupLog) console.error(`[verify] 後始末: ${line}`);
if (issues.blockedRequests.length > 0) {
  console.error(`[verify] ブロックした通信: ${issues.blockedRequests.length} 件（result.json を参照）`);
}
console.error(`[verify] 結果: ${relative(path.join(outDir, "result.json"))}`);

process.exit(status === "PASS" ? EXIT_PASS : EXIT_FAIL);
