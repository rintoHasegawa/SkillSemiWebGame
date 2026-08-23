/**
 * resolveBombButtonLabel.test
 * 爆弾ボタンのラベル決定ロジックを検証する
 * 入力ロック中に残り秒が無い場合の表示崩れを再現する
 */
import { describe, expect, it } from "vitest";

import {
  BOMB_BUTTON_READY_LABEL,
  resolveBombButtonLabel,
} from "./resolveBombButtonLabel";

describe("resolveBombButtonLabel", () => {
  it("活性時は既定ラベルを返すこと", () => {
    expect(
      resolveBombButtonLabel({ isReady: true, remainingSecText: null }),
    ).toBe(BOMB_BUTTON_READY_LABEL);
  });

  it("クールダウン中は残り秒に単位を付けて返すこと", () => {
    expect(
      resolveBombButtonLabel({ isReady: false, remainingSecText: "3" }),
    ).toBe("3s");
  });

  it("非活性でも残り秒が無い場合は既定ラベルを返すこと", () => {
    expect(
      resolveBombButtonLabel({ isReady: false, remainingSecText: null }),
    ).toBe(BOMB_BUTTON_READY_LABEL);
  });

  it("非活性で残り秒が無い場合にnullを文字列化しないこと", () => {
    expect(
      resolveBombButtonLabel({ isReady: false, remainingSecText: null }),
    ).not.toContain("null");
  });
});
