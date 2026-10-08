/**
 * debugHookKey
 * クライアントのデバッグフックが window へ公開するプロパティ名を取得する
 * 公開名はクライアントのソース（DEBUG_HOOK_GLOBAL_KEY）を唯一の定義元とし，ここでは読み出すだけにする
 */
import { readFileSync } from "node:fs";

import { DEBUG_HOOK_SOURCE } from "./paths.mjs";

const KEY_PATTERN = /export const DEBUG_HOOK_GLOBAL_KEY = "([^"]+)";/;

/**
 * デバッグフックの公開名を返す（定義が見つからなければ例外）
 * @returns {string}
 */
export const readDebugHookKey = () => {
  const source = readFileSync(DEBUG_HOOK_SOURCE, "utf8");
  const matched = KEY_PATTERN.exec(source);
  if (!matched) {
    throw new Error(
      `デバッグフックの公開名（DEBUG_HOOK_GLOBAL_KEY）が ${DEBUG_HOOK_SOURCE} に見つかりません`,
    );
  }
  return matched[1];
};
