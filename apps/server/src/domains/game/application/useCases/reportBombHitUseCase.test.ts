/**
 * reportBombHitUseCase.test
 * 被弾報告ユースケースの挙動を検証するユニットテスト
 * 受理可否の分岐とスタッツ更新・配信内容・判定結果の返却を検証する
 */
import type { PlayerHitPayload } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { BombHitReportOriginDecision } from "../ports/gameUseCasePorts";
import { reportBombHitUseCase } from "./reportBombHitUseCase";

/** 重複排除・同チーム・爆弾状態の判定結果を固定した検証ポートスタブを生成する */
const createValidationStub = (
  shouldBroadcast: boolean,
  isSameTeam: boolean = false,
  origin: BombHitReportOriginDecision = { status: "valid" },
) => {
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

/** スタッツ更新呼び出しを記録するポートスタブを生成する */
const createStatsStub = () => {
  return {
    recordBombHitForOwner: vi.fn<(bombId: string) => void>(),
  };
};

/** 被弾通知配信を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishPlayerHitToOthersInRoom: vi.fn<
      (roomId: string, deadPlayerId: string, payload: PlayerHitPayload) => void
    >(),
    publishPlayerHitToRoom: vi.fn<
      (roomId: string, payload: PlayerHitPayload) => void
    >(),
    publishHurricaneHitToRoom: vi.fn<
      (roomId: string, payload: { playerId: string }) => void
    >(),
  };
};

const input = {
  socketId: "socket-1",
  payload: { bombId: "bomb-9" },
};

describe("reportBombHitUseCase", () => {
  it("重複排除で配信不可の場合はスタッツを更新しないこと", () => {
    const validation = createValidationStub(false);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(stats.recordBombHitForOwner).not.toHaveBeenCalled();
  });

  it("重複排除で配信不可の場合は被弾通知を配信しないこと", () => {
    const validation = createValidationStub(false);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(output.publishPlayerHitToOthersInRoom).not.toHaveBeenCalled();
  });

  it("報告者が爆弾設置者と同チームの場合はスタッツを更新しないこと", () => {
    const validation = createValidationStub(true, true);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(stats.recordBombHitForOwner).not.toHaveBeenCalled();
  });

  it("報告者が爆弾設置者と同チームの場合は被弾通知を配信しないこと", () => {
    const validation = createValidationStub(true, true);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(output.publishPlayerHitToOthersInRoom).not.toHaveBeenCalled();
  });

  it("重複排除キーをソケットIDと爆弾IDから生成すること", () => {
    const validation = createValidationStub(true);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(validation.shouldBroadcastBombHitReport).toHaveBeenCalledWith(
      "8:socket-1|6:bomb-9",
    );
  });

  it("配信可の場合は爆弾所有者のスタッツを更新すること", () => {
    const validation = createValidationStub(true);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(stats.recordBombHitForOwner).toHaveBeenCalledWith("bomb-9");
  });

  it("配信可の場合は報告者を除いたルームへ被弾通知を配信すること", () => {
    const validation = createValidationStub(true);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(output.publishPlayerHitToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      { playerId: "socket-1" },
    );
  });

  it("配信可の場合もルーム全体向け被弾通知は配信しないこと", () => {
    const validation = createValidationStub(true);
    const stats = createStatsStub();
    const output = createOutputStub();

    reportBombHitUseCase({
      roomId: "room-1",
      validation,
      stats,
      input,
      output,
    });

    expect(output.publishPlayerHitToRoom).not.toHaveBeenCalled();
  });

  it("配信可の場合はacceptedを返すこと", () => {
    const decision = reportBombHitUseCase({
      roomId: "room-1",
      validation: createValidationStub(true),
      stats: createStatsStub(),
      input,
      output: createOutputStub(),
    });

    expect(decision).toEqual({ status: "accepted" });
  });

  it("重複報告の場合はduplicateを返すこと", () => {
    const decision = reportBombHitUseCase({
      roomId: "room-1",
      validation: createValidationStub(false),
      stats: createStatsStub(),
      input,
      output: createOutputStub(),
    });

    expect(decision).toEqual({ status: "duplicate" });
  });

  it("実在しない爆弾の報告はunknown_bombを返しスタッツを更新しないこと", () => {
    const stats = createStatsStub();

    const decision = reportBombHitUseCase({
      roomId: "room-1",
      validation: createValidationStub(true, false, {
        status: "unknown_bomb",
      }),
      stats,
      input,
      output: createOutputStub(),
    });

    expect(decision).toEqual({ status: "unknown_bomb" });
    expect(stats.recordBombHitForOwner).not.toHaveBeenCalled();
  });

  it("受理時刻窓を過ぎた報告はexpiredを返し配信しないこと", () => {
    const output = createOutputStub();

    const decision = reportBombHitUseCase({
      roomId: "room-1",
      validation: createValidationStub(true, false, { status: "expired" }),
      stats: createStatsStub(),
      input,
      output,
    });

    expect(decision).toEqual({ status: "expired" });
    expect(output.publishPlayerHitToOthersInRoom).not.toHaveBeenCalled();
  });

  it("爆風から離れすぎた報告はtoo_farを返し配信しないこと", () => {
    const output = createOutputStub();

    const decision = reportBombHitUseCase({
      roomId: "room-1",
      validation: createValidationStub(true, false, { status: "too_far" }),
      stats: createStatsStub(),
      input,
      output,
    });

    expect(decision).toEqual({ status: "too_far" });
    expect(output.publishPlayerHitToOthersInRoom).not.toHaveBeenCalled();
  });

  it("同チームの報告はsame_teamを返すこと", () => {
    const decision = reportBombHitUseCase({
      roomId: "room-1",
      validation: createValidationStub(true, true),
      stats: createStatsStub(),
      input,
      output: createOutputStub(),
    });

    expect(decision).toEqual({ status: "same_team" });
  });
});
