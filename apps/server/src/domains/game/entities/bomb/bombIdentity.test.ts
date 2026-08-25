/**
 * bombIdentity.test
 * サーバー採番爆弾IDの挙動を検証するユニットテスト
 * 推測不能なUUID採番と，設置数カウンタとしてのシリアル進行を検証する
 * 連番との非連続性・大量採番時の一意性・ペイロード検証の最大長も検証する
 */
import { describe, expect, it } from "vitest";

import { issueServerBombId } from "./bombIdentity";
import { MAX_BOMB_ID_LENGTH } from "./bombPayloadValidation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("issueServerBombId", () => {
  it("爆弾IDをUUID書式で採番すること", () => {
    expect(issueServerBombId({ currentSerial: 0 }).bombId).toMatch(
      UUID_PATTERN,
    );
  });

  it("爆弾IDの長さを36文字とすること", () => {
    expect(issueServerBombId({ currentSerial: 0 }).bombId).toHaveLength(36);
  });

  it("爆弾IDにシリアルの連番を含めないこと", () => {
    expect(issueServerBombId({ currentSerial: 0 }).bombId).not.toBe("1");
  });

  it("同じシリアルを渡しても毎回異なる爆弾IDを採番すること", () => {
    expect(issueServerBombId({ currentSerial: 5 }).bombId).not.toBe(
      issueServerBombId({ currentSerial: 5 }).bombId,
    );
  });

  it("連続採番で重複する爆弾IDを返さないこと", () => {
    const bombIds = Array.from({ length: 100 }, (_value, index) => {
      return issueServerBombId({ currentSerial: index }).bombId;
    });

    expect(new Set(bombIds).size).toBe(bombIds.length);
  });

  it("採番した爆弾IDがペイロード検証の最大長以内であること", () => {
    expect(
      issueServerBombId({ currentSerial: 0 }).bombId.length,
    ).toBeLessThanOrEqual(MAX_BOMB_ID_LENGTH);
  });

  it("採番した爆弾IDが数値へ変換できないこと", () => {
    expect(Number(issueServerBombId({ currentSerial: 0 }).bombId)).toBeNaN();
  });

  it("連続採番した爆弾IDが直前のIDから連続しないこと", () => {
    const first = issueServerBombId({ currentSerial: 0 });
    const second = issueServerBombId({ currentSerial: first.nextSerial });

    expect(second.bombId).not.toBe(first.bombId);
    expect(second.bombId).not.toBe(`${first.nextSerial}`);
  });

  it("1000件連続採番しても全ての爆弾IDがユニークであること", () => {
    const bombIds = Array.from({ length: 1000 }, (_value, index) => {
      return issueServerBombId({ currentSerial: index }).bombId;
    });

    expect(new Set(bombIds).size).toBe(1000);
  });

  it("シリアル0からは次シリアル1を返すこと", () => {
    expect(issueServerBombId({ currentSerial: 0 }).nextSerial).toBe(1);
  });

  it("次シリアルを渡すと連番が1ずつ進むこと", () => {
    const first = issueServerBombId({ currentSerial: 0 });
    const second = issueServerBombId({ currentSerial: first.nextSerial });

    expect(second.nextSerial).toBe(2);
  });

  it("シリアルが-1の場合は次シリアル0を返すこと", () => {
    expect(issueServerBombId({ currentSerial: -1 }).nextSerial).toBe(0);
  });

  it("シリアルが小数の場合は小数の次シリアルを返すこと", () => {
    expect(issueServerBombId({ currentSerial: 0.5 }).nextSerial).toBe(1.5);
  });

  it("シリアルがMAX_SAFE_INTEGERの場合は精度限界の次シリアルを返すこと", () => {
    expect(
      issueServerBombId({ currentSerial: Number.MAX_SAFE_INTEGER }).nextSerial,
    ).toBe(9007199254740992);
  });

  it("シリアルがNaNの場合でも爆弾IDはUUID書式で返すこと", () => {
    const result = issueServerBombId({ currentSerial: Number.NaN });

    expect(result.bombId).toMatch(UUID_PATTERN);
    expect(result.nextSerial).toBeNaN();
  });
});
