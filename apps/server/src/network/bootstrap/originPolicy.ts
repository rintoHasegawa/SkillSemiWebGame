/**
 * originPolicy
 * 接続元オリジンの正規化と許可判定を純関数として提供する
 */

/** オリジン文字列を比較用に正規化する（前後空白と末尾スラッシュを除去し小文字化） */
export const normalizeOrigin = (origin: string): string => {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
};

/** カンマ区切りの環境変数値を正規化済みの許可オリジン一覧へ変換する */
export const parseAllowedOrigins = (
  rawValue: string | undefined,
): readonly string[] => {
  if (rawValue === undefined) {
    return [];
  }

  // カンマ区切りを分割し，正規化・空要素除去・重複除去を行う
  const normalized = rawValue
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter((value) => value.length > 0);

  return [...new Set(normalized)];
};

/** オリジン許可判定の実行環境オプション */
export type OriginPolicyOptions = {
  isDevelopment: boolean;
};

/** 接続元オリジンが許可対象かを判定する */
export const isAllowedOrigin = (
  origin: string | undefined,
  allowlist: readonly string[],
  options: OriginPolicyOptions,
): boolean => {
  // Originヘッダ不在は非ブラウザクライアント（負荷テストBot・curl）として許可する
  // 空文字を誤って許可しないよう厳密比較する
  if (origin === undefined) {
    return true;
  }

  // 開発時はngrokのサブドメインが毎回変わるため全許可とする
  if (options.isDevelopment === true) {
    return true;
  }

  // 文字列 "null"（sandboxed iframe・file:// 由来）はallowlistに明記が無い限り拒否される
  return allowlist.includes(normalizeOrigin(origin));
};
