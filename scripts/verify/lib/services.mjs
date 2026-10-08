/**
 * services
 * 検証に使うローカルの server・client を用意し，自分が起動したものだけを後始末する
 * ポートが既に応答していれば人間が起動済みとみなして使うだけにし，停止しない
 * 停止はプロセス名ではなく，自分が起動したプロセスグループ（PID）に限定する
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";

import { CLIENT_URL, SERVER_URL, assertAllowedUrl } from "./guard.mjs";
import { REPO_ROOT } from "./paths.mjs";

const STARTUP_TIMEOUT_MS = 120_000;
const PROBE_INTERVAL_MS = 500;
const PROBE_TIMEOUT_MS = 3_000;
const STOP_GRACE_MS = 5_000;

/**
 * @typedef {{
 *   name: "server" | "client",
 *   url: string,
 *   startedByRunner: boolean,
 *   pid: number | null,
 *   logPath: string | null,
 *   child: import("node:child_process").ChildProcess | null,
 * }} ServiceHandle
 */

/**
 * 起動対象の定義（コマンドは docs/02_ENV/ENV_04_開発コマンド.md の起動コマンドと同じ）
 * isExpected は「このプロジェクトのサービスが応答しているか」の判定
 */
const SERVICE_DEFINITIONS = {
  server: {
    url: SERVER_URL,
    probePath: "/",
    args: ["--filter", "server", "dev"],
    isExpected: (status, body) => status === 200 && body.trim() === "ok",
  },
  client: {
    url: CLIENT_URL,
    probePath: "/",
    args: ["--filter", "client", "dev"],
    isExpected: (status, body) => status === 200 && body.includes("PixelPaintWar"),
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * URL の応答を確認する
 * @returns {Promise<"expected" | "unexpected" | "down">}
 */
const probe = async (definition) => {
  const url = new URL(definition.probePath, definition.url).href;
  assertAllowedUrl(url, "サービスの疎通確認");
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const body = await response.text();
    return definition.isExpected(response.status, body) ? "expected" : "unexpected";
  } catch {
    return "down";
  }
};

/**
 * サービスが応答していなければ起動し，応答するまで待つ
 * @param {{ name: "server" | "client", logPath: string, extraEnv?: Record<string, string | undefined> }} params
 *   extraEnv は自分が起動する場合にだけ渡す環境変数（起動済みのサービスには渡せない．undefined は削除）
 * @returns {Promise<ServiceHandle>}
 */
export const ensureService = async ({ name, logPath, extraEnv = {} }) => {
  const definition = SERVICE_DEFINITIONS[name];
  const initial = await probe(definition);

  if (initial === "expected") {
    // 人間（または別の実行）が起動済み．使うだけで停止しない
    return { name, url: definition.url, startedByRunner: false, pid: null, logPath: null, child: null };
  }

  if (initial === "unexpected") {
    throw new Error(
      `${definition.url} は別のプロセスが使用中です（このプロジェクトの ${name} の応答ではありません）．` +
        "ポートを使っているプロセスを人間が確認してください（ランナーは停止しません）",
    );
  }

  // 値が undefined の環境変数は親から引き継がない（意図しない上書きを残さないため）
  const env = { ...process.env, ...extraEnv, NODE_ENV: "development", FORCE_COLOR: "0" };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key];
  }

  const log = createWriteStream(logPath, { flags: "a" });
  // 自分のプロセスグループだけを停止できるよう detached で起動する
  const child = spawn("pnpm", definition.args, {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);

  /** @type {ServiceHandle} */
  const handle = {
    name,
    url: definition.url,
    startedByRunner: true,
    pid: child.pid ?? null,
    logPath,
    child,
  };

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  for (;;) {
    if (child.exitCode !== null) {
      throw Object.assign(
        new Error(`${name} の起動に失敗しました（終了コード ${child.exitCode}．${logPath} を参照）`),
        { handle },
      );
    }
    const state = await probe(definition);
    if (state === "expected") {
      return handle;
    }
    if (Date.now() > deadline) {
      throw Object.assign(
        new Error(
          `${name} が ${STARTUP_TIMEOUT_MS / 1000} 秒以内に応答しませんでした（${logPath} を参照）`,
        ),
        { handle },
      );
    }
    await sleep(PROBE_INTERVAL_MS);
  }
};

// プロセスグループへシグナルを送る（既に終了していれば何もしない）
const signalGroup = (pid, signal) => {
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
};

/**
 * 自分が起動したサービスだけを停止する（人間が起動したものには触らない）
 * @param {ServiceHandle} handle
 * @returns {Promise<"not_started_by_runner" | "stopped" | "killed" | "already_exited">}
 */
export const stopService = async (handle) => {
  if (!handle.startedByRunner || handle.pid === null) {
    return "not_started_by_runner";
  }

  if (!signalGroup(handle.pid, "SIGTERM")) {
    return "already_exited";
  }

  // コンテナでは孫プロセスのゾンビが回収されずグループが残って見えるため，
  // 直接の子の終了とポートの解放で停止を判定する
  const definition = SERVICE_DEFINITIONS[handle.name];
  const deadline = Date.now() + STOP_GRACE_MS;
  while (Date.now() < deadline) {
    const hasChildExited = handle.child === null || handle.child.exitCode !== null
      || handle.child.signalCode !== null;
    if (hasChildExited && (await probe(definition)) === "down") {
      return "stopped";
    }
    await sleep(200);
  }

  signalGroup(handle.pid, "SIGKILL");
  return "killed";
};

/**
 * 同期的に停止シグナルだけ送る（プロセス終了時の最終手段）
 * @param {ServiceHandle[]} handles
 */
export const killServicesSync = (handles) => {
  for (const handle of handles) {
    if (handle.startedByRunner && handle.pid !== null) {
      signalGroup(handle.pid, "SIGKILL");
    }
  }
};
