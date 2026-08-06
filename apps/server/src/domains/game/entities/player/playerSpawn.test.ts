/**
 * playerSpawn.test
 * プレイヤー生成時のスポーン座標決定の現行挙動を固定する characterization test
 * teamId ごとの基準位置・ばらつき加算・座標クランプの境界条件を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@server/config";

import { Player } from "./Player";
import { createSpawnedPlayer } from "./playerSpawn";

const { GRID_COLS, GRID_ROWS, TEAM_COUNT } = config.GAME_CONFIG;

const mapSize = { gridCols: 10, gridRows: 10 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createSpawnedPlayer", () => {
  beforeEach(() => {
    // ばらつきを0に固定して基準座標のみを検証できるようにする
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("Playerのインスタンスを返すこと", () => {
    expect(createSpawnedPlayer("socket-1", "たろう", 0, mapSize)).toBeInstanceOf(
      Player,
    );
  });

  it("引数のidを保持したプレイヤーを返すこと", () => {
    expect(createSpawnedPlayer("socket-1", "たろう", 0, mapSize).id).toBe(
      "socket-1",
    );
  });

  it("引数のnameを保持したプレイヤーを返すこと", () => {
    expect(createSpawnedPlayer("socket-1", "たろう", 0, mapSize).name).toBe(
      "たろう",
    );
  });

  it("引数のteamIdを保持したプレイヤーを返すこと", () => {
    expect(createSpawnedPlayer("socket-1", "たろう", 2, mapSize).teamId).toBe(2);
  });

  it("paintCountが0のプレイヤーを返すこと", () => {
    expect(
      createSpawnedPlayer("socket-1", "たろう", 0, mapSize).paintCount,
    ).toBe(0);
  });

  it("bombHitCountが0のプレイヤーを返すこと", () => {
    expect(
      createSpawnedPlayer("socket-1", "たろう", 0, mapSize).bombHitCount,
    ).toBe(0);
  });
});

describe("createSpawnedPlayer のチーム別基準座標", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("teamId0は左上（2,2）にスポーンすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", 0, mapSize);

    expect([player.x, player.y]).toEqual([2, 2]);
  });

  it("teamId1は右下（cols-2,rows-2）にスポーンすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", 1, mapSize);

    expect([player.x, player.y]).toEqual([8, 8]);
  });

  it("teamId2は右上（cols-2,2）にスポーンすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", 2, mapSize);

    expect([player.x, player.y]).toEqual([8, 2]);
  });

  it("teamId3は左下（2,rows-2）にスポーンすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", 3, mapSize);

    expect([player.x, player.y]).toEqual([2, 8]);
  });

  it("TEAM_COUNTと同じteamIdは剰余でteamId0と同じ位置になること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", TEAM_COUNT, mapSize);

    expect([player.x, player.y]).toEqual([2, 2]);
  });

  it("TEAM_COUNT+3のteamIdは剰余でteamId3と同じ位置になること", () => {
    const player = createSpawnedPlayer(
      "socket-1",
      "たろう",
      TEAM_COUNT + 3,
      mapSize,
    );

    expect([player.x, player.y]).toEqual([2, 8]);
  });

  it("負のteamIdはどのcaseにも一致せずマップ中央にスポーンすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", -1, mapSize);

    expect([player.x, player.y]).toEqual([5, 5]);
  });

  it("小数のteamIdはどのcaseにも一致せずマップ中央にスポーンすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", 1.5, mapSize);

    expect([player.x, player.y]).toEqual([5, 5]);
  });
});

describe("createSpawnedPlayer のばらつき加算", () => {
  it("Math.randomが0のとき基準座標から-1された座標になること", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const player = createSpawnedPlayer("socket-1", "たろう", 0, mapSize);

    expect([player.x, player.y]).toEqual([1, 1]);
  });

  it("Math.randomが1のとき基準座標から+1された座標になること", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const player = createSpawnedPlayer("socket-1", "たろう", 0, mapSize);

    expect([player.x, player.y]).toEqual([3, 3]);
  });

  it("1回目のMath.randomがx，2回目がyのばらつきに使われること", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1);
    const player = createSpawnedPlayer("socket-1", "たろう", 0, mapSize);

    expect([player.x, player.y]).toEqual([1, 3]);
  });

  it("Math.randomを2回だけ呼び出すこと", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    createSpawnedPlayer("socket-1", "たろう", 0, mapSize);

    expect(randomSpy).toHaveBeenCalledTimes(2);
  });
});

describe("createSpawnedPlayer の座標クランプ", () => {
  it("上限を超える座標はgridCols-1へクランプされること", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const player = createSpawnedPlayer("socket-1", "たろう", 0, {
      gridCols: 2,
      gridRows: 2,
    });

    expect([player.x, player.y]).toEqual([1, 1]);
  });

  it("下限を下回る座標は1へクランプされること", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const player = createSpawnedPlayer("socket-1", "たろう", 1, {
      gridCols: 4,
      gridRows: 4,
    });

    expect([player.x, player.y]).toEqual([1, 1]);
  });

  it("gridCols-1が1未満のマップでは下限クランプが優先され1になること", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const player = createSpawnedPlayer("socket-1", "たろう", 1, {
      gridCols: 1,
      gridRows: 1,
    });

    expect([player.x, player.y]).toEqual([1, 1]);
  });

  it("クランプ後もx座標が上限gridCols-1を超えないこと", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const player = createSpawnedPlayer("socket-1", "たろう", 1, {
      gridCols: 6,
      gridRows: 6,
    });

    expect(player.x).toBe(5);
  });
});

describe("createSpawnedPlayer のマップサイズ既定値", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("mapSize未指定の場合はconfigの既定グリッドを基準にすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", 1);

    expect([player.x, player.y]).toEqual([GRID_COLS - 2, GRID_ROWS - 2]);
  });

  it("mapSizeにundefinedを渡した場合も既定グリッドを基準にすること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", 1, undefined);

    expect([player.x, player.y]).toEqual([GRID_COLS - 2, GRID_ROWS - 2]);
  });

  it("mapSize未指定かつ負のteamIdでは既定グリッドの中央になること", () => {
    const player = createSpawnedPlayer("socket-1", "たろう", -1);

    expect([player.x, player.y]).toEqual([GRID_COLS / 2, GRID_ROWS / 2]);
  });
});

describe("createSpawnedPlayer の初期位置保持", () => {
  it("initialXがスポーン後のxと一致すること", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    const player = createSpawnedPlayer("socket-1", "たろう", 0, mapSize);

    expect(player.initialX).toBe(player.x);
  });

  it("initialYがスポーン後のyと一致すること", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    const player = createSpawnedPlayer("socket-1", "たろう", 0, mapSize);

    expect(player.initialY).toBe(player.y);
  });

  it("クランプされた場合もinitialXにクランプ後の値が入ること", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const player = createSpawnedPlayer("socket-1", "たろう", 0, {
      gridCols: 2,
      gridRows: 2,
    });

    expect(player.initialX).toBe(1);
  });
});
