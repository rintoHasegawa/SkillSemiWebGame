/**
 * bombHitReport.test
 * 被弾報告の重複排除キー生成の仕様を検証するテスト
 * 長さプレフィックス方式の連結書式と，区切り文字を含むIDでの衝突不在を検証する
 */
import { describe, expect, it } from "vitest";

import { createBombHitReportDedupeKey } from "./bombHitReport";

describe("createBombHitReportDedupeKey", () => {
  it("報告者ソケットIDと爆弾IDを長さプレフィックス付きで連結すること", () => {
    expect(createBombHitReportDedupeKey("socket-1", "bomb-9")).toBe(
      "8:socket-1|6:bomb-9",
    );
  });

  it("報告者が異なれば別のキーになること", () => {
    expect(createBombHitReportDedupeKey("socket-1", "bomb-9")).not.toBe(
      createBombHitReportDedupeKey("socket-2", "bomb-9"),
    );
  });

  it("爆弾IDが異なれば別のキーになること", () => {
    expect(createBombHitReportDedupeKey("socket-1", "bomb-1")).not.toBe(
      createBombHitReportDedupeKey("socket-1", "bomb-2"),
    );
  });

  it("同じ引数からは同じキーになること", () => {
    expect(createBombHitReportDedupeKey("socket-1", "bomb-9")).toBe(
      createBombHitReportDedupeKey("socket-1", "bomb-9"),
    );
  });

  it("報告者ソケットIDが空文字でも長さ0として連結すること", () => {
    expect(createBombHitReportDedupeKey("", "bomb-9")).toBe("0:|6:bomb-9");
  });

  it("爆弾IDが空文字でも長さ0として連結すること", () => {
    expect(createBombHitReportDedupeKey("socket-1", "")).toBe("8:socket-1|0:");
  });

  it("両方が空文字の場合も長さ0同士のキーになること", () => {
    expect(createBombHitReportDedupeKey("", "")).toBe("0:|0:");
  });

  it("区切り文字を含むBotIDでも境界の異なる組み合わせと衝突しないこと", () => {
    expect(createBombHitReportDedupeKey("bot:room-1:1", "bomb")).not.toBe(
      createBombHitReportDedupeKey("bot:room-1", "1:bomb"),
    );
  });

  it("区切り記号を含むIDでも別の分割と衝突しないこと", () => {
    expect(createBombHitReportDedupeKey("a|b", "c")).not.toBe(
      createBombHitReportDedupeKey("a", "b|c"),
    );
  });
});
