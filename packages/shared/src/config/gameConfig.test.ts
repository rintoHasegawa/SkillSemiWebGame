/**
 * gameConfig.test
 * フィールドサイズ解決関数と設定値の関係性を検証するテスト
 * 定数の実値ではなく，プリセットとの導出関係・後方互換エイリアスの一致を検証する
 * 未定義プリセットのフォールバックと最大グリッドサイズは SPEC_03 の表を基準とする
 */
import { describe, expect, it } from "vitest";

import {
  GAME_CONFIG,
  MAX_FIELD_GRID_SIZE,
  isFieldSizePreset,
  resolveFieldGridSize,
  type FieldSizePreset,
} from "./gameConfig";

const presetNames = Object.keys(GAME_CONFIG.FIELD_PRESETS) as FieldSizePreset[];

describe("resolveFieldGridSize", () => {
  it.each(presetNames)(
    "プリセット %s の横幅を aoiCols × AOI_CELL_SIZE で解決すること",
    (presetName) => {
      const preset = GAME_CONFIG.FIELD_PRESETS[presetName];

      expect(resolveFieldGridSize(presetName).cols).toBe(
        preset.aoiCols * GAME_CONFIG.AOI_CELL_SIZE,
      );
    },
  );

  it.each(presetNames)(
    "プリセット %s の縦幅を aoiRows × AOI_CELL_SIZE で解決すること",
    (presetName) => {
      const preset = GAME_CONFIG.FIELD_PRESETS[presetName];

      expect(resolveFieldGridSize(presetName).rows).toBe(
        preset.aoiRows * GAME_CONFIG.AOI_CELL_SIZE,
      );
    },
  );

  it("cols と rows のみを持つオブジェクトを返すこと", () => {
    expect(Object.keys(resolveFieldGridSize("SMALL")).sort()).toEqual([
      "cols",
      "rows",
    ]);
  });

  it("呼び出しごとに別インスタンスを返すこと", () => {
    expect(resolveFieldGridSize("MEDIUM")).not.toBe(
      resolveFieldGridSize("MEDIUM"),
    );
  });

  it("同じプリセットでは同じ値を返すこと", () => {
    expect(resolveFieldGridSize("LARGE")).toEqual(
      resolveFieldGridSize("LARGE"),
    );
  });

  it("未定義のプリセット名を渡しても例外を投げないこと", () => {
    const unknownPreset = "TINY" as FieldSizePreset;

    expect(() => resolveFieldGridSize(unknownPreset)).not.toThrow();
  });

  it("未定義のプリセット名を渡すと既定プリセットの値へフォールバックすること", () => {
    const unknownPreset = "TINY" as FieldSizePreset;

    expect(resolveFieldGridSize(unknownPreset)).toEqual(
      resolveFieldGridSize(GAME_CONFIG.DEFAULT_FIELD_PRESET),
    );
  });

  it("空文字のプリセット名を渡すと既定プリセットの値へフォールバックすること", () => {
    const emptyPreset = "" as FieldSizePreset;

    expect(resolveFieldGridSize(emptyPreset)).toEqual(
      resolveFieldGridSize(GAME_CONFIG.DEFAULT_FIELD_PRESET),
    );
  });

  it("既定プリセットの解決結果が36×36であること", () => {
    expect(resolveFieldGridSize(GAME_CONFIG.DEFAULT_FIELD_PRESET)).toEqual({
      cols: 36,
      rows: 36,
    });
  });
});

describe("isFieldSizePreset", () => {
  it.each(presetNames)("定義済みプリセット %s はtrueを返すこと", (presetName) => {
    expect(isFieldSizePreset(presetName)).toBe(true);
  });

  it("未定義のプリセット名はfalseを返すこと", () => {
    expect(isFieldSizePreset("TINY")).toBe(false);
  });

  it("小文字のプリセット名はfalseを返すこと", () => {
    expect(isFieldSizePreset("small")).toBe(false);
  });

  it("空文字はfalseを返すこと", () => {
    expect(isFieldSizePreset("")).toBe(false);
  });

  it("nullはfalseを返すこと", () => {
    expect(isFieldSizePreset(null)).toBe(false);
  });

  it("undefinedはfalseを返すこと", () => {
    expect(isFieldSizePreset(undefined)).toBe(false);
  });

  it("数値はfalseを返すこと", () => {
    expect(isFieldSizePreset(0)).toBe(false);
  });

  it("Objectのプロトタイプ由来のキーはfalseを返すこと", () => {
    expect(isFieldSizePreset("toString")).toBe(false);
  });
});

describe("MAX_FIELD_GRID_SIZE", () => {
  it("横幅が最大プリセットXLARGEの54であること", () => {
    expect(MAX_FIELD_GRID_SIZE.cols).toBe(54);
  });

  it("縦幅が最大プリセットXLARGEの54であること", () => {
    expect(MAX_FIELD_GRID_SIZE.rows).toBe(54);
  });

  it.each(presetNames)(
    "プリセット %s の横幅が最大グリッドサイズを超えないこと",
    (presetName) => {
      expect(resolveFieldGridSize(presetName).cols).toBeLessThanOrEqual(
        MAX_FIELD_GRID_SIZE.cols,
      );
    },
  );

  it.each(presetNames)(
    "プリセット %s の縦幅が最大グリッドサイズを超えないこと",
    (presetName) => {
      expect(resolveFieldGridSize(presetName).rows).toBeLessThanOrEqual(
        MAX_FIELD_GRID_SIZE.rows,
      );
    },
  );
});

describe("GAME_CONFIG", () => {
  it("GRID_COLS が既定プリセットの解決結果と一致すること", () => {
    expect(GAME_CONFIG.GRID_COLS).toBe(
      resolveFieldGridSize(GAME_CONFIG.DEFAULT_FIELD_PRESET).cols,
    );
  });

  it("GRID_ROWS が既定プリセットの解決結果と一致すること", () => {
    expect(GAME_CONFIG.GRID_ROWS).toBe(
      resolveFieldGridSize(GAME_CONFIG.DEFAULT_FIELD_PRESET).rows,
    );
  });

  it("後方互換の PLAYER_POSITION_UPDATE_MS が NETWORK_SYNC と一致すること", () => {
    expect(GAME_CONFIG.PLAYER_POSITION_UPDATE_MS).toBe(
      GAME_CONFIG.NETWORK_SYNC.PLAYER_POSITION_UPDATE_MS,
    );
  });

  it("後方互換の POSITION_QUANTIZE_SCALE が NETWORK_SYNC と一致すること", () => {
    expect(GAME_CONFIG.POSITION_QUANTIZE_SCALE).toBe(
      GAME_CONFIG.NETWORK_SYNC.POSITION_QUANTIZE_SCALE,
    );
  });

  it("後方互換の HURRICANE_POSITION_QUANTIZE_SCALE が NETWORK_SYNC と一致すること", () => {
    expect(GAME_CONFIG.HURRICANE_POSITION_QUANTIZE_SCALE).toBe(
      GAME_CONFIG.NETWORK_SYNC.HURRICANE_POSITION_QUANTIZE_SCALE,
    );
  });

  it("後方互換の HURRICANE_ROTATION_QUANTIZE_SCALE が NETWORK_SYNC と一致すること", () => {
    expect(GAME_CONFIG.HURRICANE_ROTATION_QUANTIZE_SCALE).toBe(
      GAME_CONFIG.NETWORK_SYNC.HURRICANE_ROTATION_QUANTIZE_SCALE,
    );
  });

  it("後方互換の BOMB_COOLDOWN_MS が通常時クールダウンと一致すること", () => {
    expect(GAME_CONFIG.BOMB_COOLDOWN_MS).toBe(
      GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS,
    );
  });

  it("フィーバー時クールダウンが通常時より短いこと", () => {
    expect(GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS).toBeLessThan(
      GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS,
    );
  });

  it("フィーバー開始しきい値が制限時間の範囲内であること", () => {
    expect(GAME_CONFIG.BOMB_FEVER_START_REMAINING_SEC).toBeLessThanOrEqual(
      GAME_CONFIG.GAME_DURATION_SEC,
    );
  });

  it("ハリケーン出現しきい値が制限時間の範囲内であること", () => {
    expect(GAME_CONFIG.HURRICANE_SPAWN_REMAINING_SEC).toBeLessThanOrEqual(
      GAME_CONFIG.GAME_DURATION_SEC,
    );
  });

  it("既定プリセットが FIELD_PRESETS に定義されていること", () => {
    expect(presetNames).toContain(GAME_CONFIG.DEFAULT_FIELD_PRESET);
  });

  it.each(presetNames)(
    "プリセット %s の推奨人数レンジが min <= max であること",
    (presetName) => {
      const { recommendedPlayers } = GAME_CONFIG.FIELD_PRESETS[presetName];

      expect(recommendedPlayers.min).toBeLessThanOrEqual(
        recommendedPlayers.max,
      );
    },
  );
});
