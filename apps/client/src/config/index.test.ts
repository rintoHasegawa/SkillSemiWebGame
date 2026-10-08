/**
 * index.test
 * クライアント実行中マップサイズ更新の検証挙動を固定するテスト
 * GAME_START ペイロードのグリッドサイズ検証と既定値フォールバックを検証する
 * 試合時間は SPEC_03「試合時間の開発モード限定の上書き」を基準に，gameDurationSec が無ければ既定の 180 秒，
 * 10〜180 の整数ならその値，範囲外なら既定値へ戻ることを検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config as sharedConfig } from "@repo/shared";

import {
  applyRuntimeGameDurationFromGameStart,
  applyRuntimeMapSizeFromGameStart,
  config,
  setRuntimeMapSizeByPreset,
} from "./index";

const DEFAULT_PRESET = sharedConfig.GAME_CONFIG.DEFAULT_FIELD_PRESET;
const defaultGridSize = sharedConfig.resolveFieldGridSize(DEFAULT_PRESET);
const maxGridSize = sharedConfig.MAX_FIELD_GRID_SIZE;

beforeEach(() => {
  // フォールバック時の console.error でテスト出力が汚れるため抑止する
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  setRuntimeMapSizeByPreset(DEFAULT_PRESET);
  applyRuntimeGameDurationFromGameStart({});
  vi.restoreAllMocks();
});

describe("applyRuntimeMapSizeFromGameStart", () => {
  it("プリセット上限内のグリッドサイズをそのまま採用すること", () => {
    applyRuntimeMapSizeFromGameStart({
      fieldSizePreset: DEFAULT_PRESET,
      gridCols: maxGridSize.cols,
      gridRows: maxGridSize.rows,
    });

    expect(config.GAME_CONFIG.GRID_COLS).toBe(maxGridSize.cols);
    expect(config.GAME_CONFIG.GRID_ROWS).toBe(maxGridSize.rows);
  });

  it("上限を超えるgridColsを無視してプリセット由来の値へフォールバックすること", () => {
    applyRuntimeMapSizeFromGameStart({
      fieldSizePreset: DEFAULT_PRESET,
      gridCols: 1e9,
      gridRows: 1e9,
    });

    expect(config.GAME_CONFIG.GRID_COLS).toBe(defaultGridSize.cols);
    expect(config.GAME_CONFIG.GRID_ROWS).toBe(defaultGridSize.rows);
  });

  it("上限を超えるgridRowsを無視してプリセット由来の値へフォールバックすること", () => {
    applyRuntimeMapSizeFromGameStart({
      fieldSizePreset: DEFAULT_PRESET,
      gridCols: defaultGridSize.cols,
      gridRows: maxGridSize.rows + 1,
    });

    expect(config.GAME_CONFIG.GRID_ROWS).toBe(defaultGridSize.rows);
  });

  it("非整数のグリッドサイズを無視してプリセット由来の値へフォールバックすること", () => {
    applyRuntimeMapSizeFromGameStart({
      fieldSizePreset: DEFAULT_PRESET,
      gridCols: 12.5,
      gridRows: 12.5,
    });

    expect(config.GAME_CONFIG.GRID_COLS).toBe(defaultGridSize.cols);
    expect(config.GAME_CONFIG.GRID_ROWS).toBe(defaultGridSize.rows);
  });

  it("範囲外のグリッドサイズ受信時にconsole.errorで通知すること", () => {
    const errorSpy = vi.mocked(console.error);

    applyRuntimeMapSizeFromGameStart({
      fieldSizePreset: DEFAULT_PRESET,
      gridCols: 1e9,
      gridRows: 1e9,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[config]"),
      expect.anything(),
    );
  });

  it("範囲外のグリッドサイズでもfieldSizePresetの指定を尊重すること", () => {
    const smallGridSize = sharedConfig.resolveFieldGridSize("SMALL");

    applyRuntimeMapSizeFromGameStart({
      fieldSizePreset: "SMALL",
      gridCols: Number.MAX_SAFE_INTEGER,
      gridRows: Number.MAX_SAFE_INTEGER,
    });

    expect(config.GAME_CONFIG.GRID_COLS).toBe(smallGridSize.cols);
    expect(config.GAME_CONFIG.GRID_ROWS).toBe(smallGridSize.rows);
  });

  it("0以下のグリッドサイズはプリセット由来の値へフォールバックすること", () => {
    applyRuntimeMapSizeFromGameStart({
      fieldSizePreset: DEFAULT_PRESET,
      gridCols: 0,
      gridRows: 0,
    });

    expect(config.GAME_CONFIG.GRID_COLS).toBe(defaultGridSize.cols);
    expect(config.GAME_CONFIG.GRID_ROWS).toBe(defaultGridSize.rows);
  });
});

describe("GAME_CONFIG.BOMB_FUSE_GAUGE_RADIUS_PX", () => {
  it("爆弾スプライトの外側の半径になること", () => {
    expect(config.GAME_CONFIG.BOMB_FUSE_GAUGE_RADIUS_PX).toBeGreaterThan(
      config.GAME_CONFIG.BOMB_RENDER_RADIUS_PX,
    );
  });

  it("縁取りを含めても隣接マスへはみ出さない半径であること", () => {
    const { BOMB_FUSE_GAUGE, BOMB_FUSE_GAUGE_RADIUS_PX, GRID_CELL_SIZE }
      = config.GAME_CONFIG;
    const outerEdgePx =
      BOMB_FUSE_GAUGE_RADIUS_PX
      + BOMB_FUSE_GAUGE.THICKNESS_PX / 2
      + BOMB_FUSE_GAUGE.OUTLINE_WIDTH_PX;

    expect(outerEdgePx).toBeLessThanOrEqual(GRID_CELL_SIZE / 2);
  });
});

// SPEC_03: 仕様上の試合時間（既定値）
const DEFAULT_GAME_DURATION_SEC = 180;

describe("applyRuntimeGameDurationFromGameStart", () => {
  it("初期状態の試合時間が既定の180秒であること", () => {
    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(DEFAULT_GAME_DURATION_SEC);
  });

  it("gameDurationSecが無い場合は既定の180秒を使うこと", () => {
    applyRuntimeGameDurationFromGameStart({});

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(DEFAULT_GAME_DURATION_SEC);
  });

  it("上書き済みの状態でgameDurationSecが無い開始通知を受けると既定の180秒へ戻ること", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });

    applyRuntimeGameDurationFromGameStart({});

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(DEFAULT_GAME_DURATION_SEC);
  });

  it("正常なgameDurationSecを採用すること", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(30);
  });

  it("下限10秒ちょうどを採用すること", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 10 });

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(10);
  });

  it("上限180秒ちょうどを採用すること", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });

    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 180 });

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(180);
  });

  it.each([9, 181, 30.5, 0, -30, Number.NaN])(
    "範囲外のgameDurationSec（%s）は既定の180秒へ戻すこと",
    (gameDurationSec) => {
      applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });

      applyRuntimeGameDurationFromGameStart({ gameDurationSec });

      expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(
        DEFAULT_GAME_DURATION_SEC,
      );
    },
  );

  it("範囲外のgameDurationSec受信時にconsole.errorで通知すること", () => {
    const errorSpy = vi.mocked(console.error);

    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 181 });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[config]"),
      expect.objectContaining({ gameDurationSec: 181 }),
    );
  });

  it("正常なgameDurationSecではconsole.errorを呼ばないこと", () => {
    const errorSpy = vi.mocked(console.error);

    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("試合時間の更新がマップサイズに影響しないこと", () => {
    const before = config.GAME_CONFIG.GRID_COLS;

    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });

    expect(config.GAME_CONFIG.GRID_COLS).toBe(before);
  });
});
