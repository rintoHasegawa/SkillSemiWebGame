/**
 * index.test
 * クライアント実行中マップサイズ更新の検証挙動を固定するテスト
 * GAME_START ペイロードのグリッドサイズ検証と既定値フォールバックを検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config as sharedConfig } from "@repo/shared";

import {
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
