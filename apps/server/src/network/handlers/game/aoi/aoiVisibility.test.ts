/**
 * aoiVisibility.test
 * 送信時のAOI可視判定の現行挙動を固定する characterization test
 * サーバ設定（セルサイズ3・窓5x3）を前提に窓境界とセル解決の境界値を検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@server/config";
import {
  isTargetInAoiWindow,
  resolveViewerAoiCell,
  resolveViewerAoiWindow,
} from "./aoiVisibility";

describe("resolveViewerAoiCell", () => {
  it("原点の受信者はセル(0,0)へ解決すること", () => {
    expect(resolveViewerAoiCell({ x: 0, y: 0 })).toEqual({ col: 0, row: 0 });
  });

  it("セルサイズ未満の座標はセル(0,0)へ解決すること", () => {
    expect(resolveViewerAoiCell({ x: 2.99, y: 2.99 })).toEqual({
      col: 0,
      row: 0,
    });
  });

  it("セルサイズちょうどの座標は次のセルへ解決すること", () => {
    expect(resolveViewerAoiCell({ x: 3, y: 3 })).toEqual({ col: 1, row: 1 });
  });

  it("負座標は負のセルへ切り下げること", () => {
    expect(resolveViewerAoiCell({ x: -0.1, y: -0.1 })).toEqual({
      col: -1,
      row: -1,
    });
  });

  it("負のセル境界ちょうどはそのセルへ解決すること", () => {
    expect(resolveViewerAoiCell({ x: -3, y: -3 })).toEqual({
      col: -1,
      row: -1,
    });
  });

  it("xとyで独立にセルを解決すること", () => {
    expect(resolveViewerAoiCell({ x: 7, y: 1 })).toEqual({ col: 2, row: 0 });
  });

  it("NaN座標はNaNのセルを返すこと", () => {
    expect(resolveViewerAoiCell({ x: Number.NaN, y: 0 }).col).toBeNaN();
  });

  it("設定値と一致するセルサイズで解決すること", () => {
    const cellSize = config.GAME_CONFIG.AOI_CELL_SIZE;

    expect(resolveViewerAoiCell({ x: cellSize, y: 0 })).toEqual({
      col: 1,
      row: 0,
    });
  });
});

describe("resolveViewerAoiWindow", () => {
  it("原点の受信者は左右2セル・上下1セルの窓を返すこと", () => {
    expect(resolveViewerAoiWindow({ x: 0, y: 0 })).toEqual({
      minCol: -2,
      maxCol: 2,
      minRow: -1,
      maxRow: 1,
    });
  });

  it("受信者セルの移動に応じて窓が平行移動すること", () => {
    expect(resolveViewerAoiWindow({ x: 3, y: 3 })).toEqual({
      minCol: -1,
      maxCol: 3,
      minRow: 0,
      maxRow: 2,
    });
  });

  it("負座標の受信者も負側の窓を返すこと", () => {
    expect(resolveViewerAoiWindow({ x: -1, y: -1 })).toEqual({
      minCol: -3,
      maxCol: 1,
      minRow: -2,
      maxRow: 0,
    });
  });

  it("窓の列幅は設定の列数と一致すること", () => {
    const aoiWindow = resolveViewerAoiWindow({ x: 0, y: 0 });

    expect(aoiWindow.maxCol - aoiWindow.minCol + 1).toBe(
      config.GAME_CONFIG.AOI_WINDOW_COLS,
    );
  });

  it("窓の行数は設定の行数と一致すること", () => {
    const aoiWindow = resolveViewerAoiWindow({ x: 0, y: 0 });

    expect(aoiWindow.maxRow - aoiWindow.minRow + 1).toBe(
      config.GAME_CONFIG.AOI_WINDOW_ROWS,
    );
  });

  it("同一セル内の座標では同じ窓を返すこと", () => {
    expect(resolveViewerAoiWindow({ x: 0.1, y: 0.1 })).toEqual(
      resolveViewerAoiWindow({ x: 2.9, y: 2.9 }),
    );
  });
});

describe("isTargetInAoiWindow", () => {
  const originWindow = resolveViewerAoiWindow({ x: 0, y: 0 });

  it("受信者と同一座標の対象は可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 0, y: 0 }, originWindow)).toBe(true);
  });

  it("右端セル内の対象は可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 8.99, y: 0 }, originWindow)).toBe(true);
  });

  it("右端セルを1セル超えた対象は不可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 9, y: 0 }, originWindow)).toBe(false);
  });

  it("左端セル内の対象は可視とすること", () => {
    expect(isTargetInAoiWindow({ x: -6, y: 0 }, originWindow)).toBe(true);
  });

  it("左端セルを1セル超えた対象は不可視とすること", () => {
    expect(isTargetInAoiWindow({ x: -6.01, y: 0 }, originWindow)).toBe(false);
  });

  it("下端セル内の対象は可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 0, y: 5.99 }, originWindow)).toBe(true);
  });

  it("下端セルを1セル超えた対象は不可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 0, y: 6 }, originWindow)).toBe(false);
  });

  it("上端セル内の対象は可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 0, y: -3 }, originWindow)).toBe(true);
  });

  it("上端セルを1セル超えた対象は不可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 0, y: -3.01 }, originWindow)).toBe(false);
  });

  it("列は範囲内でも行が範囲外なら不可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 0, y: 100 }, originWindow)).toBe(false);
  });

  it("行は範囲内でも列が範囲外なら不可視とすること", () => {
    expect(isTargetInAoiWindow({ x: 100, y: 0 }, originWindow)).toBe(false);
  });

  it("NaN座標の対象は不可視とすること", () => {
    expect(isTargetInAoiWindow({ x: Number.NaN, y: 0 }, originWindow)).toBe(
      false,
    );
  });

  it("Infinity座標の対象は不可視とすること", () => {
    expect(
      isTargetInAoiWindow(
        { x: Number.POSITIVE_INFINITY, y: 0 },
        originWindow,
      ),
    ).toBe(false);
  });

  it("窓が反転している場合は常に不可視とすること", () => {
    expect(
      isTargetInAoiWindow(
        { x: 0, y: 0 },
        { minCol: 2, maxCol: -2, minRow: 1, maxRow: -1 },
      ),
    ).toBe(false);
  });

  it("移動した受信者の窓では元の原点付近が不可視になり得ること", () => {
    const movedWindow = resolveViewerAoiWindow({ x: 30, y: 0 });

    expect(isTargetInAoiWindow({ x: 0, y: 0 }, movedWindow)).toBe(false);
  });
});
