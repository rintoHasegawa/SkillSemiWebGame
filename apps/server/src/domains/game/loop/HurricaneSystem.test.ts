/**
 * HurricaneSystem.test
 * ハリケーン生成と各サービス委譲の現行挙動を固定する characterization test
 * 出現しきい値の境界・初期配置・移動委譲・被弾委譲・初期化を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { config } from "@server/config";
import { Player } from "../entities/player/Player";
import { createPlayerEntity } from "@server/testing/playerFixtures";
import { HurricaneSystem } from "./HurricaneSystem";

const MAP_SIZE = { gridCols: 20, gridRows: 20 };
const HURRICANE_RADIUS = config.GAME_CONFIG.HURRICANE_DIAMETER_GRID / 2;
/** ハリケーン出現しきい値に到達する経過時間（ms） */
const SPAWN_ELAPSED_MS =
  (config.GAME_CONFIG.GAME_DURATION_SEC
    - config.GAME_CONFIG.HURRICANE_SPAWN_REMAINING_SEC) * 1000;

/** Math.random を固定値に差し替える */
const mockRandom = (value: number): void => {
  vi.spyOn(Math, "random").mockReturnValue(value);
};

/** テスト用のプレイヤーMapを生成する */
const createPlayerMap = (
  id: string,
  x: number,
  y: number,
  teamId = 0,
): Map<string, Player> => {
  return new Map([[id, createPlayerEntity({ id, x, y, teamId })]]);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HurricaneSystem.ensureSpawned", () => {
  it("残り時間がしきい値を上回る場合は生成しないこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);

    system.ensureSpawned(SPAWN_ELAPSED_MS - 1);

    expect(system.consumeSyncOutputs(SPAWN_ELAPSED_MS - 1)).toEqual({
      currentUpdates: [],
      updateUpdates: [],
    });
  });

  it("残り時間がしきい値とちょうど等しい場合に生成すること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);

    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(system.consumeSyncOutputs(SPAWN_ELAPSED_MS).currentUpdates).toHaveLength(
      config.GAME_CONFIG.HURRICANE_COUNT,
    );
  });

  it("設定数のハリケーンを連番IDで生成すること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);

    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(
      system.consumeSyncOutputs(SPAWN_ELAPSED_MS).currentUpdates.map(
        (entry) => entry.id,
      ),
    ).toEqual(["hurricane-1", "hurricane-2", "hurricane-3", "hurricane-4", "hurricane-5"]);
  });

  it("乱数が0の場合は半径位置へ配置し回転角0で生成すること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);

    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(system.consumeSyncOutputs(SPAWN_ELAPSED_MS).currentUpdates[0]).toEqual({
      id: "hurricane-1",
      x: HURRICANE_RADIUS,
      y: HURRICANE_RADIUS,
      radius: HURRICANE_RADIUS,
      rotationRad: 0,
    });
  });

  it("乱数が1の場合はマップ端から半径分内側へ配置すること", () => {
    mockRandom(1);
    const system = new HurricaneSystem(MAP_SIZE);

    system.ensureSpawned(SPAWN_ELAPSED_MS);

    const first = system.consumeSyncOutputs(SPAWN_ELAPSED_MS).currentUpdates[0];

    expect(first?.x).toBe(MAP_SIZE.gridCols - HURRICANE_RADIUS);
    expect(first?.y).toBe(MAP_SIZE.gridRows - HURRICANE_RADIUS);
  });

  it("乱数が1の場合は回転角に一周分の角度を量子化して返すこと", () => {
    mockRandom(1);
    const system = new HurricaneSystem(MAP_SIZE);

    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(
      system.consumeSyncOutputs(SPAWN_ELAPSED_MS).currentUpdates[0]?.rotationRad,
    ).toBe(6.25);
  });

  it("マップが直径より小さい場合でも半径位置へ配置すること", () => {
    mockRandom(0.5);
    const system = new HurricaneSystem({ gridCols: 1, gridRows: 1 });

    system.ensureSpawned(SPAWN_ELAPSED_MS);

    const first = system.consumeSyncOutputs(SPAWN_ELAPSED_MS).currentUpdates[0];

    expect(first?.x).toBe(HURRICANE_RADIUS);
    expect(first?.y).toBe(HURRICANE_RADIUS);
  });

  it("2回目以降の呼び出しでは再生成しないこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    system.consumeSyncOutputs(SPAWN_ELAPSED_MS);

    system.ensureSpawned(SPAWN_ELAPSED_MS + 10000);

    expect(system.consumeSyncOutputs(SPAWN_ELAPSED_MS + 10000)).toEqual({
      currentUpdates: [],
      updateUpdates: [],
    });
  });

  it("ハリケーン無効設定の場合は生成しないこと", () => {
    mockRandom(0);
    const mutableGameConfig = config.GAME_CONFIG as unknown as {
      HURRICANE_ENABLED: boolean;
    };
    const originalEnabled = mutableGameConfig.HURRICANE_ENABLED;
    mutableGameConfig.HURRICANE_ENABLED = false;

    try {
      const system = new HurricaneSystem(MAP_SIZE);
      system.ensureSpawned(SPAWN_ELAPSED_MS);

      expect(system.consumeSyncOutputs(SPAWN_ELAPSED_MS)).toEqual({
        currentUpdates: [],
        updateUpdates: [],
      });
    } finally {
      mutableGameConfig.HURRICANE_ENABLED = originalEnabled;
    }
  });
});

describe("HurricaneSystem.consumeSyncOutputs", () => {
  it("生成前は空の同期出力を返すこと", () => {
    const system = new HurricaneSystem(MAP_SIZE);

    expect(system.consumeSyncOutputs(0)).toEqual({
      currentUpdates: [],
      updateUpdates: [],
    });
  });

  it("生成直後の呼び出しではupdateUpdatesを空にすること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(
      system.consumeSyncOutputs(SPAWN_ELAPSED_MS).updateUpdates,
    ).toEqual([]);
  });

  it("状態が変化していない2回目の呼び出しでは両方を空にすること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    system.consumeSyncOutputs(SPAWN_ELAPSED_MS);

    expect(system.consumeSyncOutputs(SPAWN_ELAPSED_MS + 50)).toEqual({
      currentUpdates: [],
      updateUpdates: [],
    });
  });
});

describe("HurricaneSystem.update", () => {
  it("生成前に呼んでも例外を投げないこと", () => {
    const system = new HurricaneSystem(MAP_SIZE);

    expect(() => system.update(0.05)).not.toThrow();
  });

  it("速度と経過秒に応じてハリケーンを移動させること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    system.consumeSyncOutputs(SPAWN_ELAPSED_MS);

    system.update(1);

    expect(
      system.consumeSyncOutputs(SPAWN_ELAPSED_MS + 1000).updateUpdates[0]?.x,
    ).toBe(HURRICANE_RADIUS + config.GAME_CONFIG.HURRICANE_MOVE_SPEED);
  });
});

describe("HurricaneSystem.collectHitPlayerIds", () => {
  it("生成前は空配列を返すこと", () => {
    const system = new HurricaneSystem(MAP_SIZE);
    const players = createPlayerMap("player-1", HURRICANE_RADIUS, HURRICANE_RADIUS);

    expect(system.collectHitPlayerIds(players, 0)).toEqual([]);
  });

  it("接触しているプレイヤーIDを返すこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    const players = createPlayerMap("player-1", HURRICANE_RADIUS, HURRICANE_RADIUS);

    expect(system.collectHitPlayerIds(players, 0)).toEqual(["player-1"]);
  });

  it("接触していないプレイヤーIDを返さないこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    const players = createPlayerMap("player-1", 15, 15);

    expect(system.collectHitPlayerIds(players, 0)).toEqual([]);
  });

  it("クールダウン中は同じプレイヤーIDを返さないこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    const players = createPlayerMap("player-1", HURRICANE_RADIUS, HURRICANE_RADIUS);
    system.collectHitPlayerIds(players, 0);

    expect(
      system.collectHitPlayerIds(
        players,
        config.GAME_CONFIG.HURRICANE_HIT_COOLDOWN_MS - 1,
      ),
    ).toEqual([]);
  });
});

describe("HurricaneSystem.getActiveHurricaneIds", () => {
  it("生成前は空配列を返すこと", () => {
    const system = new HurricaneSystem(MAP_SIZE);

    expect(system.getActiveHurricaneIds()).toEqual([]);
  });

  it("生成済みハリケーンのIDを全件返すこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);

    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(system.getActiveHurricaneIds()).toHaveLength(
      config.GAME_CONFIG.HURRICANE_COUNT,
    );
  });

  it("同期出力を消費した後も全量同期と同じIDを返すこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    const currentIds = system
      .consumeSyncOutputs(SPAWN_ELAPSED_MS)
      .currentUpdates.map((entry) => entry.id);

    system.consumeSyncOutputs(SPAWN_ELAPSED_MS);

    expect(system.getActiveHurricaneIds()).toEqual(currentIds);
  });

  it("破棄後は空配列を返すこと", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);

    system.clear();

    expect(system.getActiveHurricaneIds()).toEqual([]);
  });
});

describe("HurricaneSystem.clear", () => {
  it("生成済みハリケーンを破棄して同期出力を空にすること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);

    system.clear();

    expect(system.consumeSyncOutputs(SPAWN_ELAPSED_MS)).toEqual({
      currentUpdates: [],
      updateUpdates: [],
    });
  });

  it("破棄後は被弾判定の対象がなくなること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    const players = createPlayerMap("player-1", HURRICANE_RADIUS, HURRICANE_RADIUS);

    system.clear();

    expect(system.collectHitPlayerIds(players, 0)).toEqual([]);
  });

  it("破棄後は再びハリケーンを生成できること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    system.consumeSyncOutputs(SPAWN_ELAPSED_MS);

    system.clear();
    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(
      system.consumeSyncOutputs(SPAWN_ELAPSED_MS).currentUpdates,
    ).toHaveLength(config.GAME_CONFIG.HURRICANE_COUNT);
  });

  it("破棄後は被弾クールダウンも初期化されること", () => {
    mockRandom(0);
    const system = new HurricaneSystem(MAP_SIZE);
    system.ensureSpawned(SPAWN_ELAPSED_MS);
    const players = createPlayerMap("player-1", HURRICANE_RADIUS, HURRICANE_RADIUS);
    system.collectHitPlayerIds(players, 0);

    system.clear();
    system.ensureSpawned(SPAWN_ELAPSED_MS);

    expect(system.collectHitPlayerIds(players, 1)).toEqual(["player-1"]);
  });
});
