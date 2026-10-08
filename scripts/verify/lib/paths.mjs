/**
 * paths
 * ランナーが参照するリポジトリ内のパスを集約する
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** リポジトリのルート */
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

/** 検証の出力先（.gitignore 済み） */
export const VERIFY_OUTPUT_ROOT = path.join(REPO_ROOT, ".verify");

/** リポジトリにコミットされたシナリオの置き場所 */
export const COMMITTED_SCENARIO_DIR = path.join(
  REPO_ROOT,
  "scripts/verify/scenarios",
);

/** デバッグフックの公開名を定義しているクライアントのソース（公開名の唯一の定義元） */
export const DEBUG_HOOK_SOURCE = path.join(
  REPO_ROOT,
  "apps/client/src/devtools/debugHook.ts",
);

/** shared のビルド成果物（client / server / Bot が参照する） */
export const SHARED_DIST_ENTRY = path.join(
  REPO_ROOT,
  "packages/shared/dist/index.mjs",
);

const pad2 = (value) => String(value).padStart(2, "0");

/**
 * 出力ディレクトリ名に使う日時（YYYYMMDD-HHMMSS，ローカル時刻）を返す
 * @param {Date} date
 * @returns {string}
 */
export const formatRunStamp = (date) => {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  );
};

/**
 * シナリオ 1 回の実行の出力先を決める（前回の証拠を上書きしない）
 * - シナリオが .verify/ 配下: <シナリオのディレクトリ>/run-<日時>/
 * - それ以外: .verify/_scenarios/<シナリオ名>/run-<日時>/
 * 同じ秒に再実行して既に存在する場合は run-<日時>-2，-3 … と連番を付ける
 * @param {{ scenarioPath: string, stamp: string, verifyOutputRoot?: string, exists?: (target: string) => boolean }} params
 *   verifyOutputRoot・exists はテストからの差し替え用
 * @returns {string}
 */
export const resolveRunOutDir = ({
  scenarioPath,
  stamp,
  verifyOutputRoot = VERIFY_OUTPUT_ROOT,
  exists = existsSync,
}) => {
  const isUnderVerifyDir = scenarioPath.startsWith(`${verifyOutputRoot}${path.sep}`);
  const base = isUnderVerifyDir
    ? path.dirname(scenarioPath)
    : path.join(verifyOutputRoot, "_scenarios", path.basename(scenarioPath, ".mjs"));
  let candidate = path.join(base, `run-${stamp}`);
  for (let suffix = 2; exists(candidate); suffix += 1) {
    candidate = path.join(base, `run-${stamp}-${suffix}`);
  }
  return candidate;
};
