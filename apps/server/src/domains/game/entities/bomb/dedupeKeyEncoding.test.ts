/**
 * dedupeKeyEncoding.test
 * 重複排除キー連結方式の仕様を検証するテスト
 * 長さプレフィックス書式と，区切り文字を含むIDでの衝突不在を検証する
 */
import { describe, expect, it } from "vitest";

import { joinDedupeKeySegments } from "./dedupeKeyEncoding";

describe("joinDedupeKeySegments", () => {
  it("各セグメントへ長さプレフィックスを付けて連結すること", () => {
    expect(joinDedupeKeySegments("abc", "defg")).toBe("3:abc|4:defg");
  });

  it("セグメントが1つの場合も長さプレフィックスを付けること", () => {
    expect(joinDedupeKeySegments("abc")).toBe("3:abc");
  });

  it("セグメントが3つ以上でも順に連結すること", () => {
    expect(joinDedupeKeySegments("a", "bb", "ccc")).toBe("1:a|2:bb|3:ccc");
  });

  it("セグメントが空の場合は空文字を返すこと", () => {
    expect(joinDedupeKeySegments()).toBe("");
  });

  it("空文字セグメントは長さ0として連結すること", () => {
    expect(joinDedupeKeySegments("", "")).toBe("0:|0:");
  });

  it("同じセグメント列からは同じキーを返すこと", () => {
    expect(joinDedupeKeySegments("abc", "defg")).toBe(
      joinDedupeKeySegments("abc", "defg"),
    );
  });

  it("セグメントの順序が異なれば別のキーになること", () => {
    expect(joinDedupeKeySegments("ab", "cd")).not.toBe(
      joinDedupeKeySegments("cd", "ab"),
    );
  });

  it("区切り文字コロンを含むIDでも境界の異なる組み合わせと衝突しないこと", () => {
    expect(joinDedupeKeySegments("bot:room-1:1", "req")).not.toBe(
      joinDedupeKeySegments("bot:room-1", "1:req"),
    );
  });

  it("区切り記号パイプを含むIDでも境界の異なる組み合わせと衝突しないこと", () => {
    expect(joinDedupeKeySegments("a|b", "c")).not.toBe(
      joinDedupeKeySegments("a", "b|c"),
    );
  });

  it("長さプレフィックス風の文字列を含むIDでも衝突しないこと", () => {
    expect(joinDedupeKeySegments("1:a", "b")).not.toBe(
      joinDedupeKeySegments("", "1:a|1:b"),
    );
  });

  it("セグメント数が異なる場合も衝突しないこと", () => {
    expect(joinDedupeKeySegments("a", "b", "c")).not.toBe(
      joinDedupeKeySegments("a", "b"),
    );
  });
});
