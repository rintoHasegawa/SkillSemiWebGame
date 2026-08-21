/**
 * installState.test
 * インストールゲート判定（SPEC_01「起動ゲート (Launch Gates)」）の仕様を検証する
 * 端末種別・PWA 起動・デバッグ用クエリの各条件と，案内種別の出し分けを対象とする
 */
import { describe, expect, it } from "vitest";

import {
  detectInstallGuide,
  detectInstallState,
  hasAllowBrowserQuery,
  InstallGuide,
  type InstallEnvironment,
} from "./installState";

/** 代表的な UA 文字列（実機の値を簡略化したもの） */
const UserAgents = {
  IPHONE_SAFARI:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  IPHONE_CHROME:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  IPHONE_FIREFOX:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
  IPHONE_EDGE:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/126.0.0.0 Mobile/15E148 Safari/605.1.15",
  IPHONE_LINE_INAPP:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.5.0",
  IPAD_SAFARI:
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1",
  IPADOS_DESKTOP_UA:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  ANDROID_CHROME:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  WINDOWS_CHROME:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  MAC_SAFARI:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
} as const;

/** 一致させるメディアクエリの集合から matchMedia 相当の関数を作る */
const createMatchMedia = (matchedQueries: readonly string[]) => {
  return (query: string): boolean => matchedQueries.includes(query);
};

/** テスト用の環境情報を生成する（既定はスマホのブラウザ表示） */
const createEnv = (
  overrides: Partial<InstallEnvironment> = {},
): InstallEnvironment => {
  return {
    matchMedia: createMatchMedia(["(pointer: coarse)"]),
    userAgent: UserAgents.ANDROID_CHROME,
    maxTouchPoints: 5,
    isNavigatorStandalone: false,
    search: "",
    ...overrides,
  };
};

/** PC（非タッチ端末）の環境情報を生成する */
const createDesktopEnv = (
  overrides: Partial<InstallEnvironment> = {},
): InstallEnvironment => {
  return createEnv({
    matchMedia: createMatchMedia(["(pointer: fine)"]),
    userAgent: UserAgents.WINDOWS_CHROME,
    maxTouchPoints: 0,
    ...overrides,
  });
};

describe("detectInstallState", () => {
  describe("PC（非タッチ端末）", () => {
    it("ゲート対象外としてプレイを許可すること", () => {
      expect(detectInstallState(createDesktopEnv())).toEqual({
        status: "allowed",
        reason: "desktop",
      });
    });

    it("タッチ非対応であればクエリ無しでも許可すること", () => {
      const env = createDesktopEnv({ search: "" });

      expect(detectInstallState(env).status).toBe("allowed");
    });

    it("タッチ点数があっても pointer: coarse に一致しなければ PC 扱いとすること", () => {
      // タッチ対応ノート PC 等．matchMedia が使える場合は pointer: coarse を優先する
      const env = createDesktopEnv({ maxTouchPoints: 10 });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "desktop",
      });
    });
  });

  describe("スマホのホーム画面（PWA）起動", () => {
    it("display-mode: standalone に一致する場合は許可すること", () => {
      const env = createEnv({
        matchMedia: createMatchMedia([
          "(pointer: coarse)",
          "(display-mode: standalone)",
        ]),
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "standalone",
      });
    });

    it("display-mode: fullscreen に一致する場合は許可すること", () => {
      const env = createEnv({
        matchMedia: createMatchMedia([
          "(pointer: coarse)",
          "(display-mode: fullscreen)",
        ]),
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "standalone",
      });
    });

    it("iOS の navigator.standalone が true の場合は許可すること", () => {
      const env = createEnv({
        userAgent: UserAgents.IPHONE_SAFARI,
        isNavigatorStandalone: true,
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "standalone",
      });
    });

    it("standalone 判定はクエリ解除より優先されること", () => {
      const env = createEnv({
        matchMedia: createMatchMedia([
          "(pointer: coarse)",
          "(display-mode: standalone)",
        ]),
        search: "?allowBrowser=1",
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "standalone",
      });
    });

    it("standalone 判定は PC 判定より優先されること", () => {
      const env = createDesktopEnv({
        matchMedia: createMatchMedia([
          "(pointer: fine)",
          "(display-mode: standalone)",
        ]),
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "standalone",
      });
    });
  });

  describe("スマホのブラウザ起動", () => {
    it("ゲートを表示（blocked）すること", () => {
      expect(detectInstallState(createEnv()).status).toBe("blocked");
    });

    it("iOS Safari では ios_safari の案内を返すこと", () => {
      const env = createEnv({
        userAgent: UserAgents.IPHONE_SAFARI,
        maxTouchPoints: 5,
      });

      expect(detectInstallState(env)).toEqual({
        status: "blocked",
        guide: InstallGuide.IOS_SAFARI,
      });
    });

    it("iOS Chrome（CriOS）では ios_other_browser の案内を返すこと", () => {
      const env = createEnv({ userAgent: UserAgents.IPHONE_CHROME });

      expect(detectInstallState(env)).toEqual({
        status: "blocked",
        guide: InstallGuide.IOS_OTHER_BROWSER,
      });
    });

    it("Android では android の案内を返すこと", () => {
      const env = createEnv({ userAgent: UserAgents.ANDROID_CHROME });

      expect(detectInstallState(env)).toEqual({
        status: "blocked",
        guide: InstallGuide.ANDROID,
      });
    });

    it("iPadOS（Macintosh UA＋複数タッチ点）では iOS の案内を返すこと", () => {
      const env = createEnv({
        userAgent: UserAgents.IPADOS_DESKTOP_UA,
        maxTouchPoints: 5,
      });

      expect(detectInstallState(env)).toEqual({
        status: "blocked",
        guide: InstallGuide.IOS_SAFARI,
      });
    });

    it("端末を特定できない場合は unknown の案内を返すこと", () => {
      const env = createEnv({ userAgent: "UnknownTouchDevice/1.0" });

      expect(detectInstallState(env)).toEqual({
        status: "blocked",
        guide: InstallGuide.UNKNOWN,
      });
    });
  });

  describe("デバッグ用クエリ（?allowBrowser=1）", () => {
    it("スマホのブラウザでもゲートを解除すること", () => {
      const env = createEnv({ search: "?allowBrowser=1" });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "query_bypass",
      });
    });

    it("他のクエリと併記されていても解除すること", () => {
      const env = createEnv({ search: "?foo=bar&allowBrowser=1" });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "query_bypass",
      });
    });

    it("allowBrowser=0 では解除しないこと", () => {
      const env = createEnv({ search: "?allowBrowser=0" });

      expect(detectInstallState(env).status).toBe("blocked");
    });

    it("無関係なクエリのみでは解除しないこと", () => {
      const env = createEnv({ search: "?foo=bar" });

      expect(detectInstallState(env).status).toBe("blocked");
    });

    it("クエリが無い場合は解除しないこと", () => {
      const env = createEnv({ search: "" });

      expect(detectInstallState(env).status).toBe("blocked");
    });
  });

  describe("matchMedia 非対応環境", () => {
    it("タッチ点数が 1 以上ならスマホとしてゲートを表示すること", () => {
      const env = createEnv({
        matchMedia: null,
        userAgent: UserAgents.ANDROID_CHROME,
        maxTouchPoints: 1,
      });

      expect(detectInstallState(env)).toEqual({
        status: "blocked",
        guide: InstallGuide.ANDROID,
      });
    });

    it("タッチ点数が 0 なら PC として許可すること", () => {
      const env = createEnv({
        matchMedia: null,
        userAgent: UserAgents.WINDOWS_CHROME,
        maxTouchPoints: 0,
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "desktop",
      });
    });

    it("navigator.standalone が true なら許可すること", () => {
      const env = createEnv({
        matchMedia: null,
        userAgent: UserAgents.IPHONE_SAFARI,
        maxTouchPoints: 5,
        isNavigatorStandalone: true,
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "standalone",
      });
    });

    it("タッチ端末でもクエリ指定があれば解除すること", () => {
      const env = createEnv({
        matchMedia: null,
        maxTouchPoints: 5,
        search: "?allowBrowser=1",
      });

      expect(detectInstallState(env)).toEqual({
        status: "allowed",
        reason: "query_bypass",
      });
    });
  });
});

describe("detectInstallGuide", () => {
  it("iPhone Safari で ios_safari を返すこと", () => {
    const env = createEnv({ userAgent: UserAgents.IPHONE_SAFARI });

    expect(detectInstallGuide(env)).toBe(InstallGuide.IOS_SAFARI);
  });

  it("iPad Safari で ios_safari を返すこと", () => {
    const env = createEnv({ userAgent: UserAgents.IPAD_SAFARI });

    expect(detectInstallGuide(env)).toBe(InstallGuide.IOS_SAFARI);
  });

  it("iOS Firefox（FxiOS）で ios_other_browser を返すこと", () => {
    const env = createEnv({ userAgent: UserAgents.IPHONE_FIREFOX });

    expect(detectInstallGuide(env)).toBe(InstallGuide.IOS_OTHER_BROWSER);
  });

  it("iOS Edge（EdgiOS）で ios_other_browser を返すこと", () => {
    const env = createEnv({ userAgent: UserAgents.IPHONE_EDGE });

    expect(detectInstallGuide(env)).toBe(InstallGuide.IOS_OTHER_BROWSER);
  });

  it("iOS のアプリ内ブラウザ（LINE）で ios_other_browser を返すこと", () => {
    const env = createEnv({ userAgent: UserAgents.IPHONE_LINE_INAPP });

    expect(detectInstallGuide(env)).toBe(InstallGuide.IOS_OTHER_BROWSER);
  });

  it("Android で android を返すこと", () => {
    const env = createEnv({ userAgent: UserAgents.ANDROID_CHROME });

    expect(detectInstallGuide(env)).toBe(InstallGuide.ANDROID);
  });

  it("iPadOS（Macintosh UA＋タッチ点 5）で ios_safari を返すこと", () => {
    const env = createEnv({
      userAgent: UserAgents.IPADOS_DESKTOP_UA,
      maxTouchPoints: 5,
    });

    expect(detectInstallGuide(env)).toBe(InstallGuide.IOS_SAFARI);
  });

  it("Mac（タッチ点 0）は iOS 扱いせず unknown を返すこと", () => {
    const env = createEnv({
      userAgent: UserAgents.MAC_SAFARI,
      maxTouchPoints: 0,
    });

    expect(detectInstallGuide(env)).toBe(InstallGuide.UNKNOWN);
  });

  it("Windows で unknown を返すこと", () => {
    const env = createEnv({ userAgent: UserAgents.WINDOWS_CHROME });

    expect(detectInstallGuide(env)).toBe(InstallGuide.UNKNOWN);
  });
});

describe("hasAllowBrowserQuery", () => {
  it("?allowBrowser=1 で true を返すこと", () => {
    expect(hasAllowBrowserQuery("?allowBrowser=1")).toBe(true);
  });

  it("先頭の ? が無くても true を返すこと", () => {
    expect(hasAllowBrowserQuery("allowBrowser=1")).toBe(true);
  });

  it("他のクエリの後ろに付いていても true を返すこと", () => {
    expect(hasAllowBrowserQuery("?room=1&allowBrowser=1")).toBe(true);
  });

  it("空文字では false を返すこと", () => {
    expect(hasAllowBrowserQuery("")).toBe(false);
  });

  it("値が 0 の場合は false を返すこと", () => {
    expect(hasAllowBrowserQuery("?allowBrowser=0")).toBe(false);
  });

  it("値が空の場合は false を返すこと", () => {
    expect(hasAllowBrowserQuery("?allowBrowser=")).toBe(false);
  });

  it("値が 1 以外（true）の場合は false を返すこと", () => {
    expect(hasAllowBrowserQuery("?allowBrowser=true")).toBe(false);
  });

  it("無関係なクエリのみでは false を返すこと", () => {
    expect(hasAllowBrowserQuery("?foo=bar")).toBe(false);
  });
});
