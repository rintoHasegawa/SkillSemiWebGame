/**
 * mapContestResolver.test
 * 塗り競合判定の現行挙動を固定する characterization test
 * 同一セルへの重なり・競合マーク・塗り可否判定の境界条件を検証する
 */
import { describe, expect, it } from "vitest";

import {
  CONTESTED_CELL,
  isCellPaintable,
  resolveUncontestedCells,
  type PlayerGridEntry,
} from "./mapContestResolver";

/** テスト用のグリッド位置情報を生成する */
const createEntry = (
  overrides: Partial<PlayerGridEntry> = {},
): PlayerGridEntry => {
  return {
    playerId: "player-1",
    gridIndex: 0,
    teamId: 1,
    ...overrides,
  };
};

describe("CONTESTED_CELL", () => {
  it("センチネル値が-2であること", () => {
    expect(CONTESTED_CELL).toBe(-2);
  });
});

describe("resolveUncontestedCells", () => {
  it("空配列の場合は空のMapを返すこと", () => {
    expect(resolveUncontestedCells([]).size).toBe(0);
  });

  it("単一エントリのセルにチームIDを割り当てること", () => {
    const result = resolveUncontestedCells([
      createEntry({ gridIndex: 5, teamId: 3 }),
    ]);

    expect(result.get(5)).toBe(3);
  });

  it("gridIndexがnullのエントリを無視すること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: null, teamId: 1 }),
    ]);

    expect(result.size).toBe(0);
  });

  it("gridIndexがnullのエントリは他エントリの判定に影響しないこと", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: null, teamId: 2 }),
      createEntry({ playerId: "p2", gridIndex: 7, teamId: 1 }),
    ]);

    expect(result.get(7)).toBe(1);
  });

  it("同一セルに同一チームが重なる場合はチームIDを保持すること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 4, teamId: 2 }),
      createEntry({ playerId: "p2", gridIndex: 4, teamId: 2 }),
    ]);

    expect(result.get(4)).toBe(2);
  });

  it("同一セルに異なるチームが重なる場合はCONTESTED_CELLをセットすること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 4, teamId: 1 }),
      createEntry({ playerId: "p2", gridIndex: 4, teamId: 2 }),
    ]);

    expect(result.get(4)).toBe(CONTESTED_CELL);
  });

  it("競合セルに後から先頭と同じチームが来てもCONTESTED_CELLのままであること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 4, teamId: 1 }),
      createEntry({ playerId: "p2", gridIndex: 4, teamId: 2 }),
      createEntry({ playerId: "p3", gridIndex: 4, teamId: 1 }),
    ]);

    expect(result.get(4)).toBe(CONTESTED_CELL);
  });

  it("3チーム以上が重なる場合もCONTESTED_CELLであること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 4, teamId: 1 }),
      createEntry({ playerId: "p2", gridIndex: 4, teamId: 2 }),
      createEntry({ playerId: "p3", gridIndex: 4, teamId: 3 }),
    ]);

    expect(result.get(4)).toBe(CONTESTED_CELL);
  });

  it("異なるセルはそれぞれ独立に判定されること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 1, teamId: 1 }),
      createEntry({ playerId: "p2", gridIndex: 2, teamId: 1 }),
      createEntry({ playerId: "p3", gridIndex: 2, teamId: 2 }),
    ]);

    expect(result.get(1)).toBe(1);
    expect(result.get(2)).toBe(CONTESTED_CELL);
  });

  it("gridIndex0を有効なセルとして扱うこと", () => {
    const result = resolveUncontestedCells([
      createEntry({ gridIndex: 0, teamId: 4 }),
    ]);

    expect(result.get(0)).toBe(4);
  });

  it("gridIndexが負の値でもキーとして扱うこと", () => {
    const result = resolveUncontestedCells([
      createEntry({ gridIndex: -5, teamId: 1 }),
    ]);

    expect(result.get(-5)).toBe(1);
  });

  it("gridIndexがNaNでも同一キーとして集約され競合になること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: Number.NaN, teamId: 1 }),
      createEntry({ playerId: "p2", gridIndex: Number.NaN, teamId: 2 }),
    ]);

    expect(result.get(Number.NaN)).toBe(CONTESTED_CELL);
  });

  it("teamId0を通常のチームとして扱うこと", () => {
    const result = resolveUncontestedCells([
      createEntry({ gridIndex: 3, teamId: 0 }),
    ]);

    expect(result.get(3)).toBe(0);
  });

  it("teamIdが-1でも通常のチームとして扱うこと", () => {
    const result = resolveUncontestedCells([
      createEntry({ gridIndex: 3, teamId: -1 }),
    ]);

    expect(result.get(3)).toBe(-1);
  });

  it("playerIdが同一でもチームが異なれば競合と判定すること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "same", gridIndex: 9, teamId: 1 }),
      createEntry({ playerId: "same", gridIndex: 9, teamId: 2 }),
    ]);

    expect(result.get(9)).toBe(CONTESTED_CELL);
  });

  it("先頭のteamIdがCONTESTED_CELLと同値の場合は別チームが来ても競合のままになること", () => {
    const result = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 6, teamId: CONTESTED_CELL }),
      createEntry({ playerId: "p2", gridIndex: 6, teamId: 1 }),
    ]);

    expect(result.get(6)).toBe(CONTESTED_CELL);
  });

  it("入力配列を変更しないこと", () => {
    const entries = [
      createEntry({ playerId: "p1", gridIndex: 1, teamId: 1 }),
      createEntry({ playerId: "p2", gridIndex: 1, teamId: 2 }),
    ];

    resolveUncontestedCells(entries);

    expect(entries).toEqual([
      { playerId: "p1", gridIndex: 1, teamId: 1 },
      { playerId: "p2", gridIndex: 1, teamId: 2 },
    ]);
  });

  it("呼び出しごとに新しいMapを返すこと", () => {
    const entries = [createEntry()];

    expect(resolveUncontestedCells(entries)).not.toBe(
      resolveUncontestedCells(entries),
    );
  });
});

describe("isCellPaintable", () => {
  it("未登録のセルはfalseを返すこと", () => {
    expect(isCellPaintable(new Map<number, number>(), 0)).toBe(false);
  });

  it("単一チームが占有するセルはtrueを返すこと", () => {
    const cellTeamMap = new Map<number, number>([[3, 1]]);

    expect(isCellPaintable(cellTeamMap, 3)).toBe(true);
  });

  it("CONTESTED_CELLのセルはfalseを返すこと", () => {
    const cellTeamMap = new Map<number, number>([[3, CONTESTED_CELL]]);

    expect(isCellPaintable(cellTeamMap, 3)).toBe(false);
  });

  it("teamId0のセルはtrueを返すこと", () => {
    const cellTeamMap = new Map<number, number>([[3, 0]]);

    expect(isCellPaintable(cellTeamMap, 3)).toBe(true);
  });

  it("teamIdが-1のセルはtrueを返すこと", () => {
    const cellTeamMap = new Map<number, number>([[3, -1]]);

    expect(isCellPaintable(cellTeamMap, 3)).toBe(true);
  });

  it("セルインデックス0の登録を正しく判定すること", () => {
    const cellTeamMap = new Map<number, number>([[0, 2]]);

    expect(isCellPaintable(cellTeamMap, 0)).toBe(true);
  });

  it("NaNキーで登録されたセルをNaNで判定できること", () => {
    const cellTeamMap = new Map<number, number>([[Number.NaN, 2]]);

    expect(isCellPaintable(cellTeamMap, Number.NaN)).toBe(true);
  });

  it("resolveUncontestedCellsの結果で非競合セルをtrueと判定すること", () => {
    const cellTeamMap = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 1, teamId: 1 }),
      createEntry({ playerId: "p2", gridIndex: 2, teamId: 2 }),
      createEntry({ playerId: "p3", gridIndex: 2, teamId: 3 }),
    ]);

    expect(isCellPaintable(cellTeamMap, 1)).toBe(true);
  });

  it("resolveUncontestedCellsの結果で競合セルをfalseと判定すること", () => {
    const cellTeamMap = resolveUncontestedCells([
      createEntry({ playerId: "p1", gridIndex: 2, teamId: 2 }),
      createEntry({ playerId: "p2", gridIndex: 2, teamId: 3 }),
    ]);

    expect(isCellPaintable(cellTeamMap, 2)).toBe(false);
  });

  it("入力のMapを変更しないこと", () => {
    const cellTeamMap = new Map<number, number>([[3, 1]]);

    isCellPaintable(cellTeamMap, 99);

    expect(cellTeamMap.size).toBe(1);
  });
});
