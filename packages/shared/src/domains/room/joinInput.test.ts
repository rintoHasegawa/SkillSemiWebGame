/**
 * joinInput.test
 * ルーム参加入力（roomId / playerName）の受け入れ条件の仕様適合を検証するテスト
 * SPEC_02「入力の受け入れ条件」（trim 後に非空・UTF-16 で 32 コードユニット以内・
 * 制御文字／不可視の書式文字／行区切り／単独サロゲートを禁止・日本語と絵文字は許可）
 * を基準に，正常系と最大長の境界値，禁止文字の失敗分岐を検証する
 * 不可視文字はソース上で判別できるようエスケープ表記で記述する
 */
import { describe, expect, it } from "vitest";

import {
  isValidPlayerName,
  isValidRoomId,
  PLAYER_NAME_MAX_LENGTH,
  ROOM_ID_MAX_LENGTH,
} from "./joinInput";

// ZWJ（U+200D）で連結した家族絵文字
const FAMILY_EMOJI =
  "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}";

// 異体字セレクタ（U+FE0F）と ZWJ を含む虹旗の絵文字
const RAINBOW_FLAG_EMOJI = "\u{1F3F3}\uFE0F\u200D\u{1F308}";

// サロゲートペアの絵文字（1 文字で 2 コードユニットと数える）
const SURROGATE_PAIR_EMOJI = "\u{1F600}";

// 絵文字だけで最大長ちょうど（32 コードユニット）になる個数
const MAX_LENGTH_EMOJI_COUNT = 16;

// 単独サロゲート（ペアを構成しない上位サロゲート）を含む値
const LONE_SURROGATE_VALUE = "a" + String.fromCharCode(0xd800) + "b";

describe("isValidRoomId", () => {
  it("半角英字のみの値を受け入れること", () => {
    expect(isValidRoomId("taro")).toBe(true);
  });

  it("半角英数とハイフンを含む値を受け入れること", () => {
    expect(isValidRoomId("room-1")).toBe(true);
  });

  it("日本語のルームIDを受け入れること", () => {
    expect(isValidRoomId("部屋１")).toBe(true);
  });

  it("語中の半角スペースを含む値を受け入れること", () => {
    expect(isValidRoomId("a b")).toBe(true);
  });

  it("単体の絵文字を受け入れること", () => {
    expect(isValidRoomId(SURROGATE_PAIR_EMOJI)).toBe(true);
  });

  it("ZWJで連結した家族絵文字を受け入れること", () => {
    expect(isValidRoomId(FAMILY_EMOJI)).toBe(true);
  });

  it("ZWJで連結した虹旗の絵文字を受け入れること", () => {
    expect(isValidRoomId(RAINBOW_FLAG_EMOJI)).toBe(true);
  });

  it("前後に空白がある値を受け入れること", () => {
    expect(isValidRoomId("  room-1  ")).toBe(true);
  });

  it("trim後が最大長ちょうどの値を受け入れること", () => {
    expect(isValidRoomId("a".repeat(ROOM_ID_MAX_LENGTH))).toBe(true);
  });

  it("前後の空白を除くと最大長ちょうどになる値を受け入れること", () => {
    expect(isValidRoomId(`  ${"a".repeat(ROOM_ID_MAX_LENGTH)}  `)).toBe(true);
  });

  it("絵文字16個（32コードユニット）の値を受け入れること", () => {
    expect(
      isValidRoomId(SURROGATE_PAIR_EMOJI.repeat(MAX_LENGTH_EMOJI_COUNT)),
    ).toBe(true);
  });

  it("絵文字17個（34コードユニット）の値を受け入れないこと", () => {
    expect(
      isValidRoomId(SURROGATE_PAIR_EMOJI.repeat(MAX_LENGTH_EMOJI_COUNT + 1)),
    ).toBe(false);
  });

  it("trim後が最大長を1コードユニット超える値を受け入れないこと", () => {
    expect(isValidRoomId("a".repeat(ROOM_ID_MAX_LENGTH + 1))).toBe(false);
  });

  it("空文字を受け入れないこと", () => {
    expect(isValidRoomId("")).toBe(false);
  });

  it("半角空白のみの値を受け入れないこと", () => {
    expect(isValidRoomId("   ")).toBe(false);
  });

  it("タブのみの値を受け入れないこと", () => {
    expect(isValidRoomId("\t")).toBe(false);
  });

  it("改行のみの値を受け入れないこと", () => {
    expect(isValidRoomId("\n")).toBe(false);
  });

  it("語中に改行を含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\nb")).toBe(false);
  });

  it("語中にタブを含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\tb")).toBe(false);
  });

  it("NUL文字を含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\u0000b")).toBe(false);
  });

  it("ゼロ幅スペースを含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\u200Bb")).toBe(false);
  });

  it("双方向制御文字（RLO）を含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\u202Eb")).toBe(false);
  });

  it("BOMを含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\uFEFFb")).toBe(false);
  });

  it("行区切り（U+2028）を含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\u2028b")).toBe(false);
  });

  it("段落区切り（U+2029）を含む値を受け入れないこと", () => {
    expect(isValidRoomId("a\u2029b")).toBe(false);
  });

  it("単独サロゲートを含む値を受け入れないこと", () => {
    expect(isValidRoomId(LONE_SURROGATE_VALUE)).toBe(false);
  });
});

describe("isValidPlayerName", () => {
  it("半角英字のみの値を受け入れること", () => {
    expect(isValidPlayerName("taro")).toBe(true);
  });

  it("半角英数とハイフンを含む値を受け入れること", () => {
    expect(isValidPlayerName("player-1")).toBe(true);
  });

  it("日本語のプレイヤー名を受け入れること", () => {
    expect(isValidPlayerName("たろう")).toBe(true);
  });

  it("語中の半角スペースを含む値を受け入れること", () => {
    expect(isValidPlayerName("a b")).toBe(true);
  });

  it("単体の絵文字を受け入れること", () => {
    expect(isValidPlayerName(SURROGATE_PAIR_EMOJI)).toBe(true);
  });

  it("ZWJで連結した家族絵文字を受け入れること", () => {
    expect(isValidPlayerName(FAMILY_EMOJI)).toBe(true);
  });

  it("ZWJで連結した虹旗の絵文字を受け入れること", () => {
    expect(isValidPlayerName(RAINBOW_FLAG_EMOJI)).toBe(true);
  });

  it("前後に空白がある値を受け入れること", () => {
    expect(isValidPlayerName("  taro  ")).toBe(true);
  });

  it("trim後が最大長ちょうどの値を受け入れること", () => {
    expect(isValidPlayerName("a".repeat(PLAYER_NAME_MAX_LENGTH))).toBe(true);
  });

  it("前後の空白を除くと最大長ちょうどになる値を受け入れること", () => {
    expect(
      isValidPlayerName(`  ${"a".repeat(PLAYER_NAME_MAX_LENGTH)}  `),
    ).toBe(true);
  });

  it("絵文字16個（32コードユニット）の値を受け入れること", () => {
    expect(
      isValidPlayerName(SURROGATE_PAIR_EMOJI.repeat(MAX_LENGTH_EMOJI_COUNT)),
    ).toBe(true);
  });

  it("絵文字17個（34コードユニット）の値を受け入れないこと", () => {
    expect(
      isValidPlayerName(
        SURROGATE_PAIR_EMOJI.repeat(MAX_LENGTH_EMOJI_COUNT + 1),
      ),
    ).toBe(false);
  });

  it("trim後が最大長を1コードユニット超える値を受け入れないこと", () => {
    expect(isValidPlayerName("a".repeat(PLAYER_NAME_MAX_LENGTH + 1))).toBe(
      false,
    );
  });

  it("空文字を受け入れないこと", () => {
    expect(isValidPlayerName("")).toBe(false);
  });

  it("半角空白のみの値を受け入れないこと", () => {
    expect(isValidPlayerName("   ")).toBe(false);
  });

  it("タブのみの値を受け入れないこと", () => {
    expect(isValidPlayerName("\t")).toBe(false);
  });

  it("改行のみの値を受け入れないこと", () => {
    expect(isValidPlayerName("\n")).toBe(false);
  });

  it("語中に改行を含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\nb")).toBe(false);
  });

  it("語中にタブを含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\tb")).toBe(false);
  });

  it("NUL文字を含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\u0000b")).toBe(false);
  });

  it("ゼロ幅スペースを含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\u200Bb")).toBe(false);
  });

  it("双方向制御文字（RLO）を含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\u202Eb")).toBe(false);
  });

  it("BOMを含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\uFEFFb")).toBe(false);
  });

  it("行区切り（U+2028）を含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\u2028b")).toBe(false);
  });

  it("段落区切り（U+2029）を含む値を受け入れないこと", () => {
    expect(isValidPlayerName("a\u2029b")).toBe(false);
  });

  it("単独サロゲートを含む値を受け入れないこと", () => {
    expect(isValidPlayerName(LONE_SURROGATE_VALUE)).toBe(false);
  });
});
