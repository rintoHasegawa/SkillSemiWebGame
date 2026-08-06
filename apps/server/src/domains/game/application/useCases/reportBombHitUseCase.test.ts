/**
 * reportBombHitUseCase.test
 * 被弾報告ユースケースの現行挙動を固定する characterization test
 * 重複排除の可否分岐とスタッツ更新・配信内容を検証する
 */
import type { PlayerHitPayload } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import { reportBombHitUseCase } from "./reportBombHitUseCase";

/** 重複排除結果を固定した検証ポートスタブを生成する */
const createValidationStub = (shouldBroadcast: boolean) => {
  return {
    shouldBroadcastBombHitReport: vi.fn<
      (dedupeKey: string, nowMs: number) => boolean
    >(() => shouldBroadcast),
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
  nowMs: 2_000,
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
      "socket-1:bomb-9",
      2_000,
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
});
