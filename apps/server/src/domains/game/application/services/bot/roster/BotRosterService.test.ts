/**
 * BotRosterService.test
 * Bot補充ロジックの現行挙動を固定する characterization test
 * チーム数割り切れ条件と要求人数の妥当性判定を検証する
 */
import { describe, expect, it } from "vitest";

import {
  createBalancedSessionPlayerIds,
  isBotPlayerId,
} from "./BotRosterService";

describe("isBotPlayerId", () => {
  it("bot接頭辞のIDはBotと判定すること", () => {
    expect(isBotPlayerId("bot:room-1:1")).toBe(true);
  });

  it("接頭辞のないIDはBotと判定しないこと", () => {
    expect(isBotPlayerId("socket-1")).toBe(false);
  });

  it("接頭辞が途中にあるIDはBotと判定しないこと", () => {
    expect(isBotPlayerId("x-bot:room-1:1")).toBe(false);
  });
});

describe("createBalancedSessionPlayerIds", () => {
  it("人数がチーム数で割り切れる場合はBotを追加しないこと", () => {
    const result = createBalancedSessionPlayerIds("room-1", [
      "s1",
      "s2",
      "s3",
      "s4",
    ]);

    expect(result).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("Bot追加なしの場合も新しい配列を返すこと", () => {
    const humanPlayerIds = ["s1", "s2", "s3", "s4"];

    expect(createBalancedSessionPlayerIds("room-1", humanPlayerIds)).not.toBe(
      humanPlayerIds,
    );
  });

  it("割り切れない人数はチーム数の倍数までBotで補充すること", () => {
    const result = createBalancedSessionPlayerIds("room-1", ["s1", "s2", "s3"]);

    expect(result).toEqual(["s1", "s2", "s3", "bot:room-1:1"]);
  });

  it("Bot IDはルームIDと連番から生成すること", () => {
    const result = createBalancedSessionPlayerIds("room-9", ["s1"]);

    expect(result).toEqual([
      "s1",
      "bot:room-9:1",
      "bot:room-9:2",
      "bot:room-9:3",
    ]);
  });

  it("参加者が0人の場合は空配列を返すこと", () => {
    expect(createBalancedSessionPlayerIds("room-1", [])).toEqual([]);
  });

  it("要求人数がチーム数の倍数なら要求人数まで補充すること", () => {
    const result = createBalancedSessionPlayerIds("room-1", ["s1", "s2"], 8);

    expect(result).toHaveLength(8);
  });

  it("要求人数がチーム数で割り切れない場合は最小構成に丸めること", () => {
    const result = createBalancedSessionPlayerIds("room-1", ["s1", "s2"], 6);

    expect(result).toHaveLength(4);
  });

  it("要求人数が最小構成未満の場合は最小構成に丸めること", () => {
    const result = createBalancedSessionPlayerIds(
      "room-1",
      ["s1", "s2", "s3", "s4", "s5"],
      4,
    );

    expect(result).toHaveLength(8);
  });

  it("要求人数が最大人数を超える場合は最小構成に丸めること", () => {
    const result = createBalancedSessionPlayerIds("room-1", ["s1", "s2"], 104);

    expect(result).toHaveLength(4);
  });

  it("要求人数が最大人数と等しい場合はその人数まで補充すること", () => {
    const result = createBalancedSessionPlayerIds("room-1", ["s1", "s2"], 100);

    expect(result).toHaveLength(100);
  });

  it("要求人数が現在人数と等しい場合はBotを追加しないこと", () => {
    const result = createBalancedSessionPlayerIds(
      "room-1",
      ["s1", "s2", "s3", "s4"],
      4,
    );

    expect(result).toEqual(["s1", "s2", "s3", "s4"]);
  });
});
