/**
 * currentPlayersBootstrapBuilder.test
 * current-players初期化ペイロード生成の現行挙動を固定する characterization test
 * AOI窓内外の座標同梱可否と量子化を検証する
 */
import { describe, expect, it } from "vitest";

import { createPlayerData } from "@server/testing/playerFixtures";
import { buildCurrentPlayersBootstrapPayload } from "./currentPlayersBootstrapBuilder";

describe("buildCurrentPlayersBootstrapPayload", () => {
  it("プレイヤーが1人もいない場合は空配列を返すこと", () => {
    expect(buildCurrentPlayersBootstrapPayload("socket-1", [])).toEqual([]);
  });

  it("自分の座標を量子化して同梱すること", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4.567_8, y: 4.123_4 }),
    ]);

    expect(payload).toEqual([
      { id: "socket-1", name: "name-socket-1", teamId: 0, x: 4.57, y: 4.12 },
    ]);
  });

  it("AOI窓内の他プレイヤーには座標を同梱すること", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 5, y: 5, teamId: 1 }),
    ]);

    expect(payload[1]).toEqual({
      id: "socket-2",
      name: "name-socket-2",
      teamId: 1,
      x: 5,
      y: 5,
    });
  });

  it("AOI窓外の他プレイヤーには座標を同梱しないこと", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 30, y: 30, teamId: 2 }),
    ]);

    expect(payload[1]).toEqual({
      id: "socket-2",
      name: "name-socket-2",
      teamId: 2,
    });
  });

  it("AOI窓の右端セル内なら座標を同梱すること", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 11.9, y: 4 }),
    ]);

    expect(payload[1]).toHaveProperty("x", 11.9);
  });

  it("AOI窓の右端セルを1マス超えたら座標を同梱しないこと", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 12, y: 4 }),
    ]);

    expect(payload[1]).not.toHaveProperty("x");
  });

  it("AOI窓の下端セル内なら座標を同梱すること", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 4, y: 8.9 }),
    ]);

    expect(payload[1]).toHaveProperty("y", 8.9);
  });

  it("AOI窓の下端セルを1マス超えたら座標を同梱しないこと", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 4, y: 9 }),
    ]);

    expect(payload[1]).not.toHaveProperty("y");
  });

  it("自分がルームに存在しない場合は誰の座標も同梱しないこと", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-9", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 5, y: 5 }),
    ]);

    expect(payload).toEqual([
      { id: "socket-1", name: "name-socket-1", teamId: 0 },
      { id: "socket-2", name: "name-socket-2", teamId: 0 },
    ]);
  });

  it("全プレイヤーのメタ情報を欠かさず返すこと", () => {
    const payload = buildCurrentPlayersBootstrapPayload("socket-1", [
      createPlayerData("socket-1", { x: 4, y: 4 }),
      createPlayerData("socket-2", { x: 5, y: 5 }),
      createPlayerData("socket-3", { x: 30, y: 30 }),
    ]);

    expect(payload.map((player) => player.id)).toEqual([
      "socket-1",
      "socket-2",
      "socket-3",
    ]);
  });
});
