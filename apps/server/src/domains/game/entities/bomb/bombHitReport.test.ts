/**
 * bombHitReport.test
 * 被弾報告の重複排除キー生成の現行挙動を固定する characterization test
 * 連結書式と空文字・区切り文字混入時の結果を検証する
 */
import { describe, expect, it } from "vitest";

import { createBombHitReportDedupeKey } from "./bombHitReport";

describe("createBombHitReportDedupeKey", () => {
  it("報告者ソケットIDと爆弾IDをコロンで連結すること", () => {
    expect(createBombHitReportDedupeKey("socket-1", "bomb-9")).toBe(
      "socket-1:bomb-9",
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

  it("報告者ソケットIDが空文字でも連結すること", () => {
    expect(createBombHitReportDedupeKey("", "bomb-9")).toBe(":bomb-9");
  });

  it("爆弾IDが空文字でも連結すること", () => {
    expect(createBombHitReportDedupeKey("socket-1", "")).toBe("socket-1:");
  });

  it("両方が空文字の場合はコロンのみを返すこと", () => {
    expect(createBombHitReportDedupeKey("", "")).toBe(":");
  });

  it("引数にコロンが含まれてもエスケープせず単純連結すること", () => {
    expect(createBombHitReportDedupeKey("a:b", "c")).toBe("a:b:c");
  });
});
