/**
 * reportBombHitValidation.test
 * 被弾報告の受理可否判定を検証するユニットテスト
 * 判定順（実在・時刻窓・距離 → 同チーム → 重複排除）と各拒否理由を検証する
 * 重複排除の時刻は爆弾ストア側のゲーム時間軸で解決するため引数では渡さない
 */
import { describe, expect, it, vi } from "vitest";

import type { BombHitReportOriginDecision } from "../ports/gameUseCasePorts";
import { decideBombHitReport } from "./reportBombHitValidation";

type ValidationStubParams = {
  shouldBroadcast?: boolean;
  isSameTeam?: boolean;
  origin?: BombHitReportOriginDecision;
};

/** 重複排除・同チーム・爆弾状態の判定結果を固定した検証ポートスタブを生成する */
const createValidationStub = ({
  shouldBroadcast = true,
  isSameTeam = false,
  origin = { status: "valid" },
}: ValidationStubParams = {}) => {
  return {
    shouldBroadcastBombHitReport: vi.fn<(dedupeKey: string) => boolean>(
      () => shouldBroadcast,
    ),
    isSameTeamBombHitReport: vi.fn<
      (reporterPlayerId: string, bombId: string) => boolean
    >(() => isSameTeam),
    checkBombHitReportOrigin: vi.fn<
      (
        reporterPlayerId: string,
        bombId: string,
      ) => BombHitReportOriginDecision
    >(() => origin),
  };
};

const input = {
  socketId: "socket-1",
  payload: { bombId: "bomb-9" },
};

describe("decideBombHitReport", () => {
  it("重複排除キーを長さプレフィックス方式で生成すること", () => {
    const validation = createValidationStub();

    decideBombHitReport(validation, input);

    expect(validation.shouldBroadcastBombHitReport).toHaveBeenCalledWith(
      "8:socket-1|6:bomb-9",
    );
  });

  it("全ての検証を通過した場合はacceptedを返すこと", () => {
    const validation = createValidationStub();

    expect(decideBombHitReport(validation, input)).toEqual({
      status: "accepted",
    });
  });

  it("重複排除が配信不可を返した場合はduplicateを返すこと", () => {
    const validation = createValidationStub({ shouldBroadcast: false });

    expect(decideBombHitReport(validation, input)).toEqual({
      status: "duplicate",
    });
  });

  it("爆弾状態の判定へ報告者IDと爆弾IDを渡すこと", () => {
    const validation = createValidationStub();

    decideBombHitReport(validation, input);

    expect(validation.checkBombHitReportOrigin).toHaveBeenCalledWith(
      "socket-1",
      "bomb-9",
    );
  });

  it("実在しない爆弾の報告はunknown_bombを返すこと", () => {
    const validation = createValidationStub({
      origin: { status: "unknown_bomb" },
    });

    expect(decideBombHitReport(validation, input)).toEqual({
      status: "unknown_bomb",
    });
  });

  it("受理時刻窓を過ぎた報告はexpiredを返すこと", () => {
    const validation = createValidationStub({ origin: { status: "expired" } });

    expect(decideBombHitReport(validation, input)).toEqual({
      status: "expired",
    });
  });

  it("爆風から離れすぎた報告はtoo_farを返すこと", () => {
    const validation = createValidationStub({ origin: { status: "too_far" } });

    expect(decideBombHitReport(validation, input)).toEqual({
      status: "too_far",
    });
  });

  it("爆弾状態の検証で拒否した報告は重複排除を消費しないこと", () => {
    const validation = createValidationStub({
      origin: { status: "unknown_bomb" },
    });

    decideBombHitReport(validation, input);

    expect(validation.shouldBroadcastBombHitReport).not.toHaveBeenCalled();
  });

  it("同チーム判定に報告者IDと爆弾IDを渡すこと", () => {
    const validation = createValidationStub();

    decideBombHitReport(validation, input);

    expect(validation.isSameTeamBombHitReport).toHaveBeenCalledWith(
      "socket-1",
      "bomb-9",
    );
  });

  it("報告者が爆弾設置者と同チームの場合はsame_teamを返すこと", () => {
    const validation = createValidationStub({ isSameTeam: true });

    expect(decideBombHitReport(validation, input)).toEqual({
      status: "same_team",
    });
  });

  it("報告者が爆弾設置者と同チームの場合は重複排除を消費しないこと", () => {
    const validation = createValidationStub({ isSameTeam: true });

    decideBombHitReport(validation, input);

    expect(validation.shouldBroadcastBombHitReport).not.toHaveBeenCalled();
  });

  it("重複排除キーへ時刻を渡さないこと", () => {
    const validation = createValidationStub();

    decideBombHitReport(validation, input);

    expect(validation.shouldBroadcastBombHitReport.mock.calls[0]).toHaveLength(
      1,
    );
  });

  it("空の爆弾IDでも長さプレフィックス方式でキーを生成すること", () => {
    const validation = createValidationStub();

    decideBombHitReport(validation, {
      ...input,
      payload: { bombId: "" },
    });

    expect(validation.shouldBroadcastBombHitReport).toHaveBeenCalledWith(
      "8:socket-1|0:",
    );
  });
});
