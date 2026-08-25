/**
 * corsPolicy.test
 * 環境変数からのCORSポリシー解決と本番の設定必須チェックを検証する
 * process.envは書き換えず，引数のenvオブジェクトで環境を与える
 */
import { describe, expect, it } from "vitest";

import { resolveCorsPolicy } from "./corsPolicy";

describe("resolveCorsPolicy", () => {
  it("NODE_ENVがproduction以外のときisDevelopmentがtrueになること", () => {
    expect(resolveCorsPolicy({ NODE_ENV: "development" }).isDevelopment).toBe(
      true,
    );
  });

  it("NODE_ENVがtestのときisDevelopmentがtrueになること", () => {
    expect(resolveCorsPolicy({ NODE_ENV: "test" }).isDevelopment).toBe(true);
  });

  it("NODE_ENVが未設定のときisDevelopmentがtrueになること", () => {
    expect(resolveCorsPolicy({}).isDevelopment).toBe(true);
  });

  it("NODE_ENVがproductionのときisDevelopmentがfalseになること", () => {
    const policy = resolveCorsPolicy({
      NODE_ENV: "production",
      CORS_ORIGIN: "https://a.com",
    });

    expect(policy.isDevelopment).toBe(false);
  });

  it("CORS_ORIGINが未設定のときallowedOriginsが空配列になること", () => {
    const policy = resolveCorsPolicy({ NODE_ENV: "development" });

    expect(policy.allowedOrigins).toEqual([]);
  });

  it("CORS_ORIGINの単一値をallowedOriginsとして解決すること", () => {
    const policy = resolveCorsPolicy({
      NODE_ENV: "development",
      CORS_ORIGIN: "https://a.com",
    });

    expect(policy.allowedOrigins).toEqual(["https://a.com"]);
  });

  it("CORS_ORIGINのカンマ区切り値を正規化済みのallowedOriginsとして解決すること", () => {
    const policy = resolveCorsPolicy({
      NODE_ENV: "development",
      CORS_ORIGIN: " HTTPS://A.com/ , https://b.com ",
    });

    expect(policy.allowedOrigins).toEqual(["https://a.com", "https://b.com"]);
  });

  it("本番でもCORS_ORIGINのカンマ区切り値を解決すること", () => {
    const policy = resolveCorsPolicy({
      NODE_ENV: "production",
      CORS_ORIGIN: "https://a.com,https://b.com/",
    });

    expect(policy.allowedOrigins).toEqual(["https://a.com", "https://b.com"]);
  });

  it("NODE_ENVがproductionかつCORS_ORIGIN未設定のときthrowすること", () => {
    expect(() => resolveCorsPolicy({ NODE_ENV: "production" })).toThrow();
  });

  it("NODE_ENVがproductionかつCORS_ORIGINが空文字のときthrowすること", () => {
    expect(() =>
      resolveCorsPolicy({ NODE_ENV: "production", CORS_ORIGIN: "" }),
    ).toThrow();
  });

  it("NODE_ENVがproductionかつCORS_ORIGINがカンマのみのときthrowすること", () => {
    expect(() =>
      resolveCorsPolicy({ NODE_ENV: "production", CORS_ORIGIN: ",," }),
    ).toThrow();
  });

  it("NODE_ENVがproductionかつCORS_ORIGINが空白のみのときthrowすること", () => {
    expect(() =>
      resolveCorsPolicy({ NODE_ENV: "production", CORS_ORIGIN: "   " }),
    ).toThrow();
  });

  it("NODE_ENVがproductionかつCORS_ORIGINが設定されているときthrowしないこと", () => {
    expect(() =>
      resolveCorsPolicy({
        NODE_ENV: "production",
        CORS_ORIGIN: "https://a.com",
      }),
    ).not.toThrow();
  });

  it("開発時はCORS_ORIGIN未設定でもthrowしないこと", () => {
    expect(() => resolveCorsPolicy({ NODE_ENV: "development" })).not.toThrow();
  });

  it("NODE_ENV未設定かつCORS_ORIGIN未設定でもthrowしないこと", () => {
    expect(() => resolveCorsPolicy({})).not.toThrow();
  });

  it("throwされるエラーメッセージにCORS_ORIGINが含まれること", () => {
    expect(() => resolveCorsPolicy({ NODE_ENV: "production" })).toThrow(
      /CORS_ORIGIN/,
    );
  });
});
