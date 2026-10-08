/**
 * run.test
 * シナリオランナー（run.mjs）の引数・シナリオ options の検証を --dry-run で検証するテスト
 * サービス起動・ブラウザ起動を伴わない範囲（--dry-run）のみを対象とする
 * 試合時間は SPEC_03「試合時間の開発モード限定の上書き」（10〜180 の整数秒）を基準とし，
 * 終了コードは 0 = 成功 / 2 = 前提未充足・引数誤り とする（run.mjs の利用方法）
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const RUN_SCRIPT = fileURLToPath(new URL("./run.mjs", import.meta.url));
const EXIT_PASS = 0;
const EXIT_PRECONDITION = 2;

/** @type {string} */
let scenarioDir;

/**
 * 一時ディレクトリにシナリオファイルを書き出してパスを返す
 * @param {string} fileName
 * @param {string} source
 */
const writeScenario = (fileName, source) => {
  const filePath = path.join(scenarioDir, fileName);
  writeFileSync(filePath, source);
  return filePath;
};

/**
 * ランナーを実行して終了コードと標準エラー出力を返す
 * @param {string[]} args
 */
const runRunner = (args) => {
  const result = spawnSync(process.execPath, [RUN_SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, INIT_CWD: undefined },
    timeout: 30_000,
  });
  return { status: result.status, stderr: result.stderr };
};

/**
 * --dry-run の出力（標準エラーの JSON）を解析する
 * @param {string} stderr
 */
const parseDryRun = (stderr) => {
  return JSON.parse(stderr.slice(stderr.indexOf("{")));
};

const scenarioBody = "export default async () => {};\n";

/** @type {Record<string, string>} */
const scenarios = {};

beforeAll(() => {
  scenarioDir = mkdtempSync(path.join(os.tmpdir(), "verify-run-test-"));
  scenarios.noOptions = writeScenario("no-options.mjs", scenarioBody);
  scenarios.duration30 = writeScenario(
    "duration-30.mjs",
    `export const options = { gameDurationSec: 30 };\n${scenarioBody}`,
  );
  scenarios.durationString = writeScenario(
    "duration-string.mjs",
    `export const options = { gameDurationSec: "30" };\n${scenarioBody}`,
  );
  scenarios.durationBoolean = writeScenario(
    "duration-boolean.mjs",
    `export const options = { gameDurationSec: true };\n${scenarioBody}`,
  );
  scenarios.duration181 = writeScenario(
    "duration-181.mjs",
    `export const options = { gameDurationSec: 181 };\n${scenarioBody}`,
  );
  scenarios.duration9 = writeScenario(
    "duration-9.mjs",
    `export const options = { gameDurationSec: 9 };\n${scenarioBody}`,
  );
  scenarios.durationFraction = writeScenario(
    "duration-fraction.mjs",
    `export const options = { gameDurationSec: 30.5 };\n${scenarioBody}`,
  );
  scenarios.noDefault = writeScenario("no-default.mjs", "export const options = {};\n");
  scenarios.notMjs = writeScenario("scenario.js", scenarioBody);
  mkdirSync(path.join(scenarioDir, "dir.mjs"));
});

afterAll(() => {
  rmSync(scenarioDir, { recursive: true, force: true });
});

describe("run.mjs --dry-run（試合時間）", () => {
  it("試合時間の指定が無い場合は requestedSec が null であること", () => {
    const { status, stderr } = runRunner([scenarios.noOptions, "--dry-run"]);

    expect(status).toBe(EXIT_PASS);
    expect(parseDryRun(stderr).gameDuration).toEqual({ requestedSec: null, source: null });
  });

  it("シナリオの options.gameDurationSec を採用すること", () => {
    const { status, stderr } = runRunner([scenarios.duration30, "--dry-run"]);

    expect(status).toBe(EXIT_PASS);
    expect(parseDryRun(stderr).gameDuration).toEqual({ requestedSec: 30, source: "scenario" });
  });

  it("CLI の --game-duration-sec がシナリオの指定より優先されること", () => {
    const { status, stderr } = runRunner([
      scenarios.duration30,
      "--game-duration-sec",
      "45",
      "--dry-run",
    ]);

    expect(status).toBe(EXIT_PASS);
    expect(parseDryRun(stderr).gameDuration).toEqual({ requestedSec: 45, source: "cli" });
  });

  it.each(["10", "180"])("CLI の境界値 %s を受け付けること", (value) => {
    const { status, stderr } = runRunner([
      scenarios.noOptions,
      "--game-duration-sec",
      value,
      "--dry-run",
    ]);

    expect(status).toBe(EXIT_PASS);
    expect(parseDryRun(stderr).gameDuration.requestedSec).toBe(Number(value));
  });

  it.each(["9", "181", "30.5", "abc", " 30", "30 ", "0x1e", "3e1", "30.0", "-30", ""])(
    "CLI の不正な値 \"%s\" を終了コード 2 で拒否すること",
    (value) => {
      const { status, stderr } = runRunner([
        scenarios.noOptions,
        "--game-duration-sec",
        value,
        "--dry-run",
      ]);

      expect(status).toBe(EXIT_PRECONDITION);
      expect(stderr).toContain("--game-duration-sec の値が不正です");
    },
  );

  it("CLI の値が欠落している場合は終了コード 2 で拒否すること", () => {
    const { status } = runRunner([scenarios.noOptions, "--dry-run", "--game-duration-sec"]);

    expect(status).toBe(EXIT_PRECONDITION);
  });

  it("シナリオの options.gameDurationSec が文字列の場合は型の誤りとして拒否すること", () => {
    const { status, stderr } = runRunner([scenarios.durationString, "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
    expect(stderr).toContain("数値で指定してください");
    expect(stderr).toContain('文字列 "30"');
  });

  it("シナリオの options.gameDurationSec が真偽値の場合は型の誤りとして拒否すること", () => {
    const { status, stderr } = runRunner([scenarios.durationBoolean, "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
    expect(stderr).toContain("数値で指定してください");
  });

  it.each([
    ["duration181", "181"],
    ["duration9", "9"],
    ["durationFraction", "30.5"],
  ])("シナリオの options.gameDurationSec が範囲外（%s）の場合は拒否すること", (key) => {
    const { status, stderr } = runRunner([scenarios[key], "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
    expect(stderr).toContain("options.gameDurationSec が不正です");
  });

  it("CLI の値が正しくてもシナリオ側の不正な options を拒否すること", () => {
    const { status } = runRunner([
      scenarios.durationString,
      "--game-duration-sec",
      "30",
      "--dry-run",
    ]);

    expect(status).toBe(EXIT_PRECONDITION);
  });
});

describe("run.mjs --dry-run（タイムアウト）", () => {
  it("--timeout-sec が無い場合は既定の 600 秒であること", () => {
    const { stderr } = runRunner([scenarios.noOptions, "--dry-run"]);

    expect(parseDryRun(stderr).timeoutSec).toBe(600);
  });

  it("--timeout-sec の整数を採用すること", () => {
    const { status, stderr } = runRunner([scenarios.noOptions, "--timeout-sec", "60", "--dry-run"]);

    expect(status).toBe(EXIT_PASS);
    expect(parseDryRun(stderr).timeoutSec).toBe(60);
  });

  it.each(["0", "abc", "1.5", "-1", " 60", ""])(
    "--timeout-sec の不正な値 \"%s\" を終了コード 2 で拒否すること",
    (value) => {
      const { status, stderr } = runRunner([scenarios.noOptions, "--timeout-sec", value, "--dry-run"]);

      expect(status).toBe(EXIT_PRECONDITION);
      expect(stderr).toContain("--timeout-sec の値が不正です");
    },
  );
});

describe("run.mjs（引数・シナリオの検証）", () => {
  it("シナリオが指定されていない場合は終了コード 2 で終了すること", () => {
    const { status } = runRunner(["--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
  });

  it("シナリオが 2 つ指定された場合は終了コード 2 で終了すること", () => {
    const { status } = runRunner([scenarios.noOptions, scenarios.duration30, "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
  });

  it("不明なオプションを終了コード 2 で拒否すること", () => {
    const { status, stderr } = runRunner([scenarios.noOptions, "--unknown", "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
    expect(stderr).toContain("不明なオプション");
  });

  it("存在しないシナリオを終了コード 2 で拒否すること", () => {
    const { status, stderr } = runRunner([path.join(scenarioDir, "missing.mjs"), "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
    expect(stderr).toContain("シナリオが見つかりません");
  });

  it("ディレクトリを指定した場合は終了コード 2 で拒否すること", () => {
    const { status } = runRunner([path.join(scenarioDir, "dir.mjs"), "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
  });

  it(".mjs 以外のシナリオを終了コード 2 で拒否すること", () => {
    const { status, stderr } = runRunner([scenarios.notMjs, "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
    expect(stderr).toContain(".mjs");
  });

  it("default export の関数が無いシナリオを終了コード 2 で拒否すること", () => {
    const { status, stderr } = runRunner([scenarios.noDefault, "--dry-run"]);

    expect(status).toBe(EXIT_PRECONDITION);
    expect(stderr).toContain("default export");
  });
});

describe("run.mjs --dry-run（接続先・出力先）", () => {
  it("接続先がローカルの client / server であること", () => {
    const { stderr } = runRunner([scenarios.noOptions, "--dry-run"]);
    const parsed = parseDryRun(stderr);

    expect([parsed.clientUrl, parsed.serverUrl]).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
  });

  it(".verify 外のシナリオの出力先が .verify/_scenarios/<シナリオ名>/run-<日時> であること", () => {
    const { stderr } = runRunner([scenarios.duration30, "--dry-run"]);

    expect(parseDryRun(stderr).outDir).toMatch(
      /^\.verify\/_scenarios\/duration-30\/run-\d{8}-\d{6}$/,
    );
  });
});
