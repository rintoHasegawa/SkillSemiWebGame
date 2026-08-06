/**
 * bombIdentity.test
 * サーバー採番爆弾IDの現行挙動を固定する characterization test
 * 採番の起点・連番の進み方と非整数・巨大値の境界を検証する
 */
import { describe, expect, it } from "vitest";

import { issueServerBombId } from "./bombIdentity";

describe("issueServerBombId", () => {
  it("シリアル0からは爆弾ID1を採番すること", () => {
    expect(issueServerBombId({ currentSerial: 0 }).bombId).toBe("1");
  });

  it("シリアル0からは次シリアル1を返すこと", () => {
    expect(issueServerBombId({ currentSerial: 0 }).nextSerial).toBe(1);
  });

  it("爆弾IDは次シリアルの文字列表現であること", () => {
    const { bombId, nextSerial } = issueServerBombId({ currentSerial: 41 });

    expect(bombId).toBe(String(nextSerial));
  });

  it("次シリアルを渡すと連番が1ずつ進むこと", () => {
    const first = issueServerBombId({ currentSerial: 0 });
    const second = issueServerBombId({ currentSerial: first.nextSerial });

    expect(second.bombId).toBe("2");
  });

  it("同じシリアルを渡すと同じ爆弾IDを返すこと", () => {
    expect(issueServerBombId({ currentSerial: 5 }).bombId).toBe(
      issueServerBombId({ currentSerial: 5 }).bombId,
    );
  });

  it("シリアルが-1の場合は爆弾ID0を採番すること", () => {
    expect(issueServerBombId({ currentSerial: -1 })).toEqual({
      bombId: "0",
      nextSerial: 0,
    });
  });

  it("シリアルが負値の場合は負の爆弾IDを採番すること", () => {
    expect(issueServerBombId({ currentSerial: -5 })).toEqual({
      bombId: "-4",
      nextSerial: -4,
    });
  });

  it("シリアルが小数の場合は小数の爆弾IDを採番すること", () => {
    expect(issueServerBombId({ currentSerial: 0.5 })).toEqual({
      bombId: "1.5",
      nextSerial: 1.5,
    });
  });

  it("シリアルがMAX_SAFE_INTEGERの場合は精度限界の値を返すこと", () => {
    expect(issueServerBombId({ currentSerial: Number.MAX_SAFE_INTEGER })).toEqual({
      bombId: "9007199254740992",
      nextSerial: 9007199254740992,
    });
  });

  it("シリアルがNaNの場合は爆弾IDにNaN文字列を返すこと", () => {
    const result = issueServerBombId({ currentSerial: Number.NaN });

    expect(result.bombId).toBe("NaN");
    expect(result.nextSerial).toBeNaN();
  });
});
