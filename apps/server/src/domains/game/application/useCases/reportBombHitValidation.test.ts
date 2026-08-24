/**
 * reportBombHitValidation.test
 * 被弾報告の処理要否判定の現行挙動を固定する characterization test
 * 重複排除キー生成と判定結果の透過を検証する
 */
import { describe, expect, it, vi } from "vitest";

import { shouldPublishPlayerHitFromBombHit } from "./reportBombHitValidation";

/** 重複排除結果と同チーム判定結果を固定した検証ポートスタブを生成する */
const createValidationStub = (
  shouldBroadcast: boolean,
  isSameTeam: boolean = false,
) => {
  return {
    shouldBroadcastBombHitReport: vi.fn<
      (dedupeKey: string, nowMs: number) => boolean
    >(() => shouldBroadcast),
    isSameTeamBombHitReport: vi.fn<
      (reporterPlayerId: string, bombId: string) => boolean
    >(() => isSameTeam),
  };
};

const input = {
  socketId: "socket-1",
  payload: { bombId: "bomb-9" },
  nowMs: 500,
};

describe("shouldPublishPlayerHitFromBombHit", () => {
  it("重複排除キーを長さプレフィックス方式で生成すること", () => {
    const validation = createValidationStub(true);

    shouldPublishPlayerHitFromBombHit(validation, input);

    expect(validation.shouldBroadcastBombHitReport).toHaveBeenCalledWith(
      "8:socket-1|6:bomb-9",
      500,
    );
  });

  it("重複排除が配信可を返した場合はtrueを返すこと", () => {
    const validation = createValidationStub(true);

    expect(shouldPublishPlayerHitFromBombHit(validation, input)).toBe(true);
  });

  it("重複排除が配信不可を返した場合はfalseを返すこと", () => {
    const validation = createValidationStub(false);

    expect(shouldPublishPlayerHitFromBombHit(validation, input)).toBe(false);
  });

  it("同チーム判定に報告者IDと爆弾IDを渡すこと", () => {
    const validation = createValidationStub(true);

    shouldPublishPlayerHitFromBombHit(validation, input);

    expect(validation.isSameTeamBombHitReport).toHaveBeenCalledWith(
      "socket-1",
      "bomb-9",
    );
  });

  it("報告者が爆弾設置者と同チームの場合はfalseを返すこと", () => {
    const validation = createValidationStub(true, true);

    expect(shouldPublishPlayerHitFromBombHit(validation, input)).toBe(false);
  });

  it("報告者が爆弾設置者と同チームの場合は重複排除を消費しないこと", () => {
    const validation = createValidationStub(true, true);

    shouldPublishPlayerHitFromBombHit(validation, input);

    expect(validation.shouldBroadcastBombHitReport).not.toHaveBeenCalled();
  });

  it("nowMsが0でもそのまま重複排除へ渡すこと", () => {
    const validation = createValidationStub(true);

    shouldPublishPlayerHitFromBombHit(validation, {
      ...input,
      nowMs: 0,
    });

    expect(validation.shouldBroadcastBombHitReport).toHaveBeenCalledWith(
      "8:socket-1|6:bomb-9",
      0,
    );
  });
});
