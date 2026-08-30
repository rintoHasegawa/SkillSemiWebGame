/**
 * joinInput.test
 * ルーム参加入力（roomId / playerName）の受け入れ条件の仕様適合を検証するテスト
 * SPEC_02「入力の受け入れ条件」（trim 後に非空・UTF-16 で 32 コードユニット以内・
 * 制御文字／不可視の書式文字／行区切り／単独サロゲートを禁止・日本語と絵文字は許可）
 * を基準に，正常系と最大長の境界値，禁止文字の失敗分岐を検証する
 * roomId と playerName は同じ受け入れ条件を共有するため，検証対象を
 * [describe名, 判定関数, 最大長, 呼称, 固有の入力例] のケース表にまとめ，
 * describe.each で両者へ同一のケース群を適用する
 * 最大長は現状どちらも 32 だが，将来の分岐を検知できるよう定数のまま表に渡す
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

/** 検証対象1件分の条件（describe名・判定関数・最大長・入力の呼称・対象固有の入力例） */
type JoinInputTarget = [
  describeName: string,
  isValid: (value: string) => boolean,
  maxLength: number,
  inputLabel: string,
  hyphenatedValue: string,
  japaneseValue: string,
  paddedValue: string,
];

const targets: JoinInputTarget[] = [
  [
    "isValidRoomId",
    isValidRoomId,
    ROOM_ID_MAX_LENGTH,
    "ルームID",
    "room-1",
    "部屋１",
    "  room-1  ",
  ],
  [
    "isValidPlayerName",
    isValidPlayerName,
    PLAYER_NAME_MAX_LENGTH,
    "プレイヤー名",
    "player-1",
    "たろう",
    "  taro  ",
  ],
];

describe.each(targets)(
  "%s",
  (
    _describeName,
    isValid,
    maxLength,
    inputLabel,
    hyphenatedValue,
    japaneseValue,
    paddedValue,
  ) => {
    it("半角英字のみの値を受け入れること", () => {
      expect(isValid("taro")).toBe(true);
    });

    it("半角英数とハイフンを含む値を受け入れること", () => {
      expect(isValid(hyphenatedValue)).toBe(true);
    });

    it(`日本語の${inputLabel}を受け入れること`, () => {
      expect(isValid(japaneseValue)).toBe(true);
    });

    it("語中の半角スペースを含む値を受け入れること", () => {
      expect(isValid("a b")).toBe(true);
    });

    it("単体の絵文字を受け入れること", () => {
      expect(isValid(SURROGATE_PAIR_EMOJI)).toBe(true);
    });

    it("ZWJで連結した家族絵文字を受け入れること", () => {
      expect(isValid(FAMILY_EMOJI)).toBe(true);
    });

    it("ZWJで連結した虹旗の絵文字を受け入れること", () => {
      expect(isValid(RAINBOW_FLAG_EMOJI)).toBe(true);
    });

    it("前後に空白がある値を受け入れること", () => {
      expect(isValid(paddedValue)).toBe(true);
    });

    it("trim後が最大長ちょうどの値を受け入れること", () => {
      expect(isValid("a".repeat(maxLength))).toBe(true);
    });

    it("前後の空白を除くと最大長ちょうどになる値を受け入れること", () => {
      expect(isValid(`  ${"a".repeat(maxLength)}  `)).toBe(true);
    });

    it("絵文字16個（32コードユニット）の値を受け入れること", () => {
      expect(
        isValid(SURROGATE_PAIR_EMOJI.repeat(MAX_LENGTH_EMOJI_COUNT)),
      ).toBe(true);
    });

    it("絵文字17個（34コードユニット）の値を受け入れないこと", () => {
      expect(
        isValid(SURROGATE_PAIR_EMOJI.repeat(MAX_LENGTH_EMOJI_COUNT + 1)),
      ).toBe(false);
    });

    it("trim後が最大長を1コードユニット超える値を受け入れないこと", () => {
      expect(isValid("a".repeat(maxLength + 1))).toBe(false);
    });

    it("空文字を受け入れないこと", () => {
      expect(isValid("")).toBe(false);
    });

    it("半角空白のみの値を受け入れないこと", () => {
      expect(isValid("   ")).toBe(false);
    });

    it("タブのみの値を受け入れないこと", () => {
      expect(isValid("\t")).toBe(false);
    });

    it("改行のみの値を受け入れないこと", () => {
      expect(isValid("\n")).toBe(false);
    });

    it("語中に改行を含む値を受け入れないこと", () => {
      expect(isValid("a\nb")).toBe(false);
    });

    it("語中にタブを含む値を受け入れないこと", () => {
      expect(isValid("a\tb")).toBe(false);
    });

    it("NUL文字を含む値を受け入れないこと", () => {
      expect(isValid("a\u0000b")).toBe(false);
    });

    it("ゼロ幅スペースを含む値を受け入れないこと", () => {
      expect(isValid("a\u200Bb")).toBe(false);
    });

    it("双方向制御文字（RLO）を含む値を受け入れないこと", () => {
      expect(isValid("a\u202Eb")).toBe(false);
    });

    it("BOMを含む値を受け入れないこと", () => {
      expect(isValid("a\uFEFFb")).toBe(false);
    });

    it("行区切り（U+2028）を含む値を受け入れないこと", () => {
      expect(isValid("a\u2028b")).toBe(false);
    });

    it("段落区切り（U+2029）を含む値を受け入れないこと", () => {
      expect(isValid("a\u2029b")).toBe(false);
    });

    it("単独サロゲートを含む値を受け入れないこと", () => {
      expect(isValid(LONE_SURROGATE_VALUE)).toBe(false);
    });
  },
);
