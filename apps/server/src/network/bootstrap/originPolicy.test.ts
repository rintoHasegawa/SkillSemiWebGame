/**
 * originPolicy.test
 * オリジンの正規化・allowlist解釈・許可判定の仕様を検証する
 * 本番相当（isDevelopment: false）と開発相当（isDevelopment: true）の両方を対象とする
 */
import { describe, expect, it } from "vitest";

import {
  isAllowedOrigin,
  normalizeOrigin,
  parseAllowedOrigins,
} from "./originPolicy";

/** 本番相当の判定オプション */
const productionOptions = { isDevelopment: false };

/** 開発相当の判定オプション */
const developmentOptions = { isDevelopment: true };

describe("normalizeOrigin", () => {
  it("前後の空白を除去すること", () => {
    expect(normalizeOrigin("  https://a.com  ")).toBe("https://a.com");
  });

  it("末尾のスラッシュを除去すること", () => {
    expect(normalizeOrigin("https://a.com/")).toBe("https://a.com");
  });

  it("末尾のスラッシュが複数でも除去すること", () => {
    expect(normalizeOrigin("https://a.com//")).toBe("https://a.com");
  });

  it("大文字を小文字化すること", () => {
    expect(normalizeOrigin("HTTPS://EXAMPLE.COM")).toBe("https://example.com");
  });

  it("空白とスラッシュと大文字が混在しても正規化すること", () => {
    expect(normalizeOrigin("  HTTPS://Example.com//  ")).toBe(
      "https://example.com",
    );
  });

  it("正規化済みのオリジンはそのまま返すこと", () => {
    expect(normalizeOrigin("https://a.com")).toBe("https://a.com");
  });

  it("空文字は空文字のまま返すこと", () => {
    expect(normalizeOrigin("")).toBe("");
  });
});

describe("parseAllowedOrigins", () => {
  it("undefinedを渡すと空配列を返すこと", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it("空文字を渡すと空配列を返すこと", () => {
    expect(parseAllowedOrigins("")).toEqual([]);
  });

  it("単一のオリジンを解釈すること", () => {
    expect(parseAllowedOrigins("https://a.com")).toEqual(["https://a.com"]);
  });

  it("カンマ区切りの複数オリジンを解釈すること", () => {
    expect(parseAllowedOrigins("https://a.com,https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("各要素の前後空白を除去すること", () => {
    expect(parseAllowedOrigins(" https://a.com , https://b.com ")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("各要素の末尾スラッシュを除去し小文字化すること", () => {
    expect(parseAllowedOrigins("HTTPS://A.com/,https://B.com//")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("空要素を除外すること", () => {
    expect(parseAllowedOrigins("https://a.com,,https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("末尾カンマによる空要素を除外すること", () => {
    expect(parseAllowedOrigins("https://a.com,")).toEqual(["https://a.com"]);
  });

  it("空白のみの要素を除外すること", () => {
    expect(parseAllowedOrigins("  ,  ")).toEqual([]);
  });

  it("正規化後に重複するオリジンを除去すること", () => {
    expect(parseAllowedOrigins("https://a.com,https://a.com/")).toEqual([
      "https://a.com",
    ]);
  });
});

describe("isAllowedOrigin（本番相当）", () => {
  it("allowlistに含まれるオリジンを許可すること", () => {
    expect(
      isAllowedOrigin("https://a.com", ["https://a.com"], productionOptions),
    ).toBe(true);
  });

  it("allowlistに含まれないオリジンを拒否すること", () => {
    expect(
      isAllowedOrigin("https://evil.com", ["https://a.com"], productionOptions),
    ).toBe(false);
  });

  it("複数のallowlistのうち後方の要素も許可すること", () => {
    expect(
      isAllowedOrigin(
        "https://b.com",
        ["https://a.com", "https://b.com"],
        productionOptions,
      ),
    ).toBe(true);
  });

  it("末尾スラッシュ付きで渡されても正規化して許可すること", () => {
    expect(
      isAllowedOrigin("https://a.com/", ["https://a.com"], productionOptions),
    ).toBe(true);
  });

  it("大文字で渡されても正規化して許可すること", () => {
    expect(
      isAllowedOrigin("HTTPS://A.COM", ["https://a.com"], productionOptions),
    ).toBe(true);
  });

  it("originがundefinedのとき許可すること", () => {
    expect(
      isAllowedOrigin(undefined, ["https://a.com"], productionOptions),
    ).toBe(true);
  });

  it("文字列のnullを拒否すること", () => {
    expect(isAllowedOrigin("null", ["https://a.com"], productionOptions)).toBe(
      false,
    );
  });

  it("空文字を拒否すること", () => {
    expect(isAllowedOrigin("", ["https://a.com"], productionOptions)).toBe(
      false,
    );
  });

  it("ポートが異なるだけのオリジンを拒否すること", () => {
    expect(
      isAllowedOrigin(
        "https://a.com:8443",
        ["https://a.com"],
        productionOptions,
      ),
    ).toBe(false);
  });

  it("スキームが異なるだけのオリジンを拒否すること", () => {
    expect(
      isAllowedOrigin("http://a.com", ["https://a.com"], productionOptions),
    ).toBe(false);
  });

  it("allowlistが空のときすべてのブラウザオリジンを拒否すること", () => {
    expect(isAllowedOrigin("https://a.com", [], productionOptions)).toBe(false);
  });

  it("allowlistが空でもoriginがundefinedなら許可すること", () => {
    expect(isAllowedOrigin(undefined, [], productionOptions)).toBe(true);
  });

  it("allowlistに文字列のnullが明記されていれば許可すること", () => {
    expect(isAllowedOrigin("null", ["null"], productionOptions)).toBe(true);
  });
});

describe("isAllowedOrigin（開発相当）", () => {
  it("http://localhost:5173を許可すること", () => {
    expect(
      isAllowedOrigin("http://localhost:5173", [], developmentOptions),
    ).toBe(true);
  });

  it("ポートが異なるlocalhostを許可すること", () => {
    expect(
      isAllowedOrigin("http://localhost:3000", [], developmentOptions),
    ).toBe(true);
  });

  it("プレビュー用ポートのlocalhostを許可すること", () => {
    expect(
      isAllowedOrigin("http://localhost:4173", [], developmentOptions),
    ).toBe(true);
  });

  it("LANのIPを許可すること", () => {
    expect(
      isAllowedOrigin("http://192.168.0.5:5173", [], developmentOptions),
    ).toBe(true);
  });

  it("ngrokのURLを許可すること", () => {
    expect(
      isAllowedOrigin(
        "https://xxxx-xxxx.ngrok-free.app",
        [],
        developmentOptions,
      ),
    ).toBe(true);
  });

  it("allowlistが空でも任意のオリジンを許可すること", () => {
    expect(isAllowedOrigin("https://evil.com", [], developmentOptions)).toBe(
      true,
    );
  });

  it("allowlistに含まれないオリジンでも許可すること", () => {
    expect(
      isAllowedOrigin(
        "https://evil.com",
        ["https://a.com"],
        developmentOptions,
      ),
    ).toBe(true);
  });

  it("originがundefinedでも許可すること", () => {
    expect(isAllowedOrigin(undefined, [], developmentOptions)).toBe(true);
  });
});
