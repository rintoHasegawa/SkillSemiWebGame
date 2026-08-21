/**
 * installState
 * PWA インストールゲートの表示要否を判定する純ロジック
 * matchMedia・navigator 由来の情報を引数で受け取り，副作用を持たない
 */

/** ゲート表示時に案内する手順の種別 */
export const InstallGuide = {
  IOS_SAFARI: "ios_safari",
  IOS_OTHER_BROWSER: "ios_other_browser",
  ANDROID: "android",
  UNKNOWN: "unknown",
} as const;

/** InstallGuide の値を表す型 */
export type InstallGuideType = (typeof InstallGuide)[keyof typeof InstallGuide];

/** ゲートを解除する理由 */
export type InstallAllowedReason = "standalone" | "desktop" | "query_bypass";

/** インストールゲートの判定結果 */
export type InstallState =
  | { status: "allowed"; reason: InstallAllowedReason }
  | { status: "blocked"; guide: InstallGuideType };

/** 判定に必要な環境情報（window / navigator への依存を切り出したもの） */
export type InstallEnvironment = {
  /** メディアクエリの一致判定（matchMedia 非対応環境では null） */
  matchMedia: ((query: string) => boolean) | null;
  userAgent: string;
  maxTouchPoints: number;
  /** iOS Safari 独自の standalone 判定値 */
  isNavigatorStandalone: boolean;
  /** location.search（先頭の "?" を含む文字列） */
  search: string;
};

/** ゲートを一時解除するクエリキー（実機ブラウザデバッグ用） */
export const ALLOW_BROWSER_QUERY_KEY = "allowBrowser";

/** ゲート解除と判定するクエリ値 */
const ALLOW_BROWSER_QUERY_VALUE = "1";

/** ホーム画面（PWA）起動とみなす display-mode のメディアクエリ */
export const STANDALONE_DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
] as const;

// iOS 上で Safari 以外のブラウザ・アプリ内ブラウザを示す UA トークン
const IOS_NON_SAFARI_PATTERN =
  /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser|Coast|GSA\/|FBAN|FBAV|Instagram|Line\/|Twitter/i;

const matchesQuery = (env: InstallEnvironment, query: string): boolean => {
  return env.matchMedia?.(query) ?? false;
};

// タッチ操作が主となる端末（スマホ・タブレット）かを判定する
const isTouchPrimaryDevice = (env: InstallEnvironment): boolean => {
  if (env.matchMedia === null) {
    // matchMedia 非対応環境ではタッチポイント数で代替判定する
    return env.maxTouchPoints > 0;
  }

  return matchesQuery(env, "(pointer: coarse)");
};

// ホーム画面（PWA）から起動されているかを判定する
const isStandaloneLaunch = (env: InstallEnvironment): boolean => {
  return (
    STANDALONE_DISPLAY_MODE_QUERIES.some((query) => matchesQuery(env, query)) ||
    env.isNavigatorStandalone
  );
};

// iOS / iPadOS かを判定する（iPadOS はデスクトップ UA を返すため触点数で補う）
const isIosDevice = (env: InstallEnvironment): boolean => {
  if (/iPad|iPhone|iPod/i.test(env.userAgent)) {
    return true;
  }

  return /Macintosh/i.test(env.userAgent) && env.maxTouchPoints > 1;
};

const isAndroidDevice = (env: InstallEnvironment): boolean => {
  return /Android/i.test(env.userAgent);
};

/** ゲート解除クエリ（?allowBrowser=1）が付いているかを判定する */
export const hasAllowBrowserQuery = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get(ALLOW_BROWSER_QUERY_KEY) === ALLOW_BROWSER_QUERY_VALUE;
};

/** 端末・ブラウザ種別から表示すべき手順の種別を判定する */
export const detectInstallGuide = (
  env: InstallEnvironment,
): InstallGuideType => {
  if (isIosDevice(env)) {
    // iOS はホーム画面追加が Safari でしか行えないため，ブラウザ種別で案内を分ける
    return IOS_NON_SAFARI_PATTERN.test(env.userAgent)
      ? InstallGuide.IOS_OTHER_BROWSER
      : InstallGuide.IOS_SAFARI;
  }

  if (isAndroidDevice(env)) {
    return InstallGuide.ANDROID;
  }

  return InstallGuide.UNKNOWN;
};

/** 環境情報からインストールゲートの表示要否を判定する */
export const detectInstallState = (env: InstallEnvironment): InstallState => {
  // ホーム画面から起動済みならゲート不要
  if (isStandaloneLaunch(env)) {
    return { status: "allowed", reason: "standalone" };
  }

  // PC（非タッチ端末）はインストール必須の対象外
  if (!isTouchPrimaryDevice(env)) {
    return { status: "allowed", reason: "desktop" };
  }

  // 実機ブラウザデバッグ用のクエリ指定でゲートを解除する
  if (hasAllowBrowserQuery(env.search)) {
    return { status: "allowed", reason: "query_bypass" };
  }

  return { status: "blocked", guide: detectInstallGuide(env) };
};
