/**
 * GameLoop.test
 * ルーム定周期ループの現行挙動を固定する characterization test
 * tickスケジューリング・塗り判定・Bot更新・被弾検知の決定的な範囲を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { domain } from "@repo/shared";
import { ActiveBombRegistry, type ActiveBomb } from "../entities/bomb/ActiveBombRegistry";
import { MapStore } from "../entities/map/MapStore";
import { Player } from "../entities/player/Player";
import { GameLoop, type GameLoopCallbacks } from "./GameLoop";

const TICK_RATE_MS = 50;
const GRID_COLS = 10;
const GRID_ROWS = 10;
const BOT_PLAYER_ID = "bot:room-1:1";
const FIXED_WALL_CLOCK_MS = 1_700_000_000_000;

/** performance.now が返す現在時刻（ms） */
let currentPerfMs = 0;

/** テスト用のプレイヤーを生成する */
const createPlayer = (
  id: string,
  x: number,
  y: number,
  teamId = 0,
): Player => {
  const player = new Player(id, id, teamId);
  player.x = x;
  player.y = y;
  player.initialX = x;
  player.initialY = y;
  return player;
};

/** テスト用の爆弾を生成する */
const createBomb = (overrides: Partial<ActiveBomb> = {}): ActiveBomb => {
  return {
    bombId: "bomb-1",
    ownerPlayerId: "human-1",
    x: 0.5,
    y: 0.5,
    explodeAtElapsedMs: 0,
    ownerTeamId: 1,
    ...overrides,
  };
};

/** テストで利用するループ一式 */
type LoopHarness = {
  loop: GameLoop;
  players: Map<string, Player>;
  mapStore: MapStore;
  activeBombRegistry: ActiveBombRegistry;
  onTick: ReturnType<typeof vi.fn>;
  onGameEnd: ReturnType<typeof vi.fn>;
  onBotPlaceBomb: ReturnType<typeof vi.fn>;
  onBotBombHit: ReturnType<typeof vi.fn>;
  onHurricanePlayerHit: ReturnType<typeof vi.fn>;
};

/** GameLoop とその依存をまとめて生成する */
const createHarness = (
  playerList: Player[] = [createPlayer("human-1", 2.5, 3.5, 1)],
  omittedCallbacks: {
    omitBotPlaceBomb?: boolean;
    omitBotBombHit?: boolean;
    omitHurricanePlayerHit?: boolean;
  } = {},
): LoopHarness => {
  const players = new Map(playerList.map((player) => [player.id, player]));
  const mapStore = new MapStore({ gridCols: GRID_COLS, gridRows: GRID_ROWS });
  const activeBombRegistry = new ActiveBombRegistry();
  const onTick = vi.fn();
  const onGameEnd = vi.fn();
  const onBotPlaceBomb = vi.fn();
  const onBotBombHit = vi.fn();
  const onHurricanePlayerHit = vi.fn();

  const callbacks: GameLoopCallbacks = {
    onTick,
    onGameEnd,
    onBotPlaceBomb: omittedCallbacks.omitBotPlaceBomb ? undefined : onBotPlaceBomb,
    onBotBombHit: omittedCallbacks.omitBotBombHit ? undefined : onBotBombHit,
    onHurricanePlayerHit: omittedCallbacks.omitHurricanePlayerHit
      ? undefined
      : onHurricanePlayerHit,
  };

  const loop = new GameLoop({
    roomId: "room-1",
    tickRate: TICK_RATE_MS,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    players,
    mapStore,
    activeBombRegistry,
    callbacks,
  });

  return {
    loop,
    players,
    mapStore,
    activeBombRegistry,
    onTick,
    onGameEnd,
    onBotPlaceBomb,
    onBotBombHit,
    onHurricanePlayerHit,
  };
};

/** 指定時刻へ進めてスケジュール済みのtickサイクルを1回実行する */
const runNextTickCycle = (atPerfMs: number): void => {
  currentPerfMs = atPerfMs;
  vi.advanceTimersToNextTimer();
};

/** onTick へ渡された指定回目のtickデータを取り出す */
const getTickData = (
  onTick: ReturnType<typeof vi.fn>,
  callIndex = 0,
): domain.game.tick.TickData => {
  return onTick.mock.calls[callIndex]?.[0] as domain.game.tick.TickData;
};

beforeEach(() => {
  vi.useFakeTimers();
  currentPerfMs = 0;
  vi.spyOn(performance, "now").mockImplementation(() => currentPerfMs);
  vi.spyOn(Date, "now").mockReturnValue(FIXED_WALL_CLOCK_MS);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GameLoop.start", () => {
  it("tickRate経過後に最初のtickを実行すること", () => {
    const harness = createHarness();
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.onTick).toHaveBeenCalledTimes(1);
  });

  it("次tick時刻に達していない場合はtickを実行しないこと", () => {
    const harness = createHarness();
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS - 1);

    expect(harness.onTick).not.toHaveBeenCalled();
  });

  it("開始済みの状態で再度呼んでもtickを二重実行しないこと", () => {
    const harness = createHarness();
    harness.loop.start();
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.onTick).toHaveBeenCalledTimes(1);
  });

  it("遅延が大きい場合でも1サイクルで最大3tickまで処理すること", () => {
    const harness = createHarness();
    harness.loop.start();

    runNextTickCycle(1000);

    expect(harness.onTick).toHaveBeenCalledTimes(3);
  });

  it("キャッチアップ上限到達時は次tick時刻を現在時刻基準へ再設定すること", () => {
    const harness = createHarness();
    harness.loop.start();
    runNextTickCycle(1000);

    runNextTickCycle(1000 + TICK_RATE_MS - 1);

    expect(harness.onTick).toHaveBeenCalledTimes(3);
  });

  it("再設定された次tick時刻に到達したらtickを再開すること", () => {
    const harness = createHarness();
    harness.loop.start();
    runNextTickCycle(1000);
    runNextTickCycle(1000 + TICK_RATE_MS - 1);

    runNextTickCycle(1000 + TICK_RATE_MS);

    expect(harness.onTick).toHaveBeenCalledTimes(4);
  });

  it("ゲーム制限時間に到達したらonGameEndを呼ぶこと", () => {
    const harness = createHarness();
    harness.loop.start();

    runNextTickCycle(180_000);

    expect(harness.onGameEnd).toHaveBeenCalledTimes(1);
  });

  it("ゲーム制限時間に到達したtickサイクルではonTickを呼ばないこと", () => {
    const harness = createHarness();
    harness.loop.start();

    runNextTickCycle(180_000);

    expect(harness.onTick).not.toHaveBeenCalled();
  });
});

describe("GameLoop.stop", () => {
  it("停止後はtickを実行しないこと", () => {
    const harness = createHarness();
    harness.loop.start();

    harness.loop.stop();
    currentPerfMs = 1000;
    vi.advanceTimersByTime(1000);

    expect(harness.onTick).not.toHaveBeenCalled();
  });

  it("開始前に呼んでも例外を投げないこと", () => {
    const harness = createHarness();

    expect(() => harness.loop.stop()).not.toThrow();
  });

  it("停止後に再開すると全プレイヤーの位置を再送すること", () => {
    const harness = createHarness();
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);
    harness.loop.stop();

    currentPerfMs = 100;
    harness.loop.start();
    runNextTickCycle(150);

    expect(getTickData(harness.onTick, 1).playerUpdates).toEqual([
      { id: "human-1", x: 2.5, y: 3.5 },
    ]);
  });

  it("停止時にBot制御昇格を解除すること", () => {
    const harness = createHarness([createPlayer("human-1", 0.5, 0.5)]);
    harness.loop.promotePlayerToBotControl("human-1");
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);
    const movedY = harness.players.get("human-1")!.y;
    harness.loop.stop();

    currentPerfMs = 100;
    harness.loop.start();
    runNextTickCycle(150);

    expect(harness.players.get("human-1")!.y).toBe(movedY);
  });
});

describe("GameLoop.buildTickData", () => {
  it("初回tickで全プレイヤーの位置をplayerUpdatesへ含めること", () => {
    const harness = createHarness([
      createPlayer("human-1", 2.5, 3.5, 1),
      createPlayer("human-2", 4.5, 5.5, 2),
    ]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(getTickData(harness.onTick).playerUpdates).toEqual([
      { id: "human-1", x: 2.5, y: 3.5 },
      { id: "human-2", x: 4.5, y: 5.5 },
    ]);
  });

  it("位置が変化していないプレイヤーを2回目のtickへ含めないこと", () => {
    const harness = createHarness();
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);

    runNextTickCycle(TICK_RATE_MS * 2);

    expect(getTickData(harness.onTick, 1).playerUpdates).toEqual([]);
  });

  it("位置が変化したプレイヤーをplayerUpdatesへ含めること", () => {
    const harness = createHarness();
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);
    harness.players.get("human-1")!.x = 6.5;

    runNextTickCycle(TICK_RATE_MS * 2);

    expect(getTickData(harness.onTick, 1).playerUpdates).toEqual([
      { id: "human-1", x: 6.5, y: 3.5 },
    ]);
  });

  it("退出したプレイヤーをplayerUpdatesへ含めないこと", () => {
    const harness = createHarness([
      createPlayer("human-1", 2.5, 3.5, 1),
      createPlayer("human-2", 4.5, 5.5, 2),
    ]);
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);
    harness.players.delete("human-2");
    harness.players.get("human-1")!.x = 6.5;

    runNextTickCycle(TICK_RATE_MS * 2);

    expect(getTickData(harness.onTick, 1).playerUpdates).toEqual([
      { id: "human-1", x: 6.5, y: 3.5 },
    ]);
  });

  it("退出後に再参加したプレイヤーを再びplayerUpdatesへ含めること", () => {
    const rejoining = createPlayer("human-2", 4.5, 5.5, 2);
    const harness = createHarness([createPlayer("human-1", 2.5, 3.5, 1), rejoining]);
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);
    harness.players.delete("human-2");
    runNextTickCycle(TICK_RATE_MS * 2);
    harness.players.set("human-2", rejoining);

    runNextTickCycle(TICK_RATE_MS * 3);

    expect(getTickData(harness.onTick, 2).playerUpdates).toEqual([
      { id: "human-2", x: 4.5, y: 5.5 },
    ]);
  });

  it("マップ差分を取得後にキューをクリアすること", () => {
    const harness = createHarness();
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);

    runNextTickCycle(TICK_RATE_MS * 2);

    expect(getTickData(harness.onTick, 1).cellUpdates).toEqual([]);
  });

  it("ハリケーン未生成時はhurricaneSyncを空にすること", () => {
    const harness = createHarness();
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(getTickData(harness.onTick).hurricaneSync).toEqual({
      currentUpdates: [],
      updateUpdates: [],
    });
  });
});

describe("GameLoop.paintUncontestedCells", () => {
  it("プレイヤーが立つセルを自チーム色で塗ること", () => {
    const harness = createHarness([createPlayer("human-1", 2.5, 3.5, 1)]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(getTickData(harness.onTick).cellUpdates).toEqual([
      { index: 3 * GRID_COLS + 2, teamId: 1 },
    ]);
  });

  it("塗り替えが発生したプレイヤーのpaintCountを加算すること", () => {
    const harness = createHarness([createPlayer("human-1", 2.5, 3.5, 1)]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.players.get("human-1")!.paintCount).toBe(1);
  });

  it("同じセルを再度塗ってもpaintCountを加算しないこと", () => {
    const harness = createHarness([createPlayer("human-1", 2.5, 3.5, 1)]);
    harness.loop.start();
    runNextTickCycle(TICK_RATE_MS);

    runNextTickCycle(TICK_RATE_MS * 2);

    expect(harness.players.get("human-1")!.paintCount).toBe(1);
  });

  it("同一セルに異なるチームが重なった場合は塗らないこと", () => {
    const harness = createHarness([
      createPlayer("human-1", 2.5, 3.5, 1),
      createPlayer("human-2", 2.2, 3.2, 2),
    ]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(getTickData(harness.onTick).cellUpdates).toEqual([]);
  });

  it("同一セルに異なるチームが重なった場合はpaintCountも加算しないこと", () => {
    const harness = createHarness([
      createPlayer("human-1", 2.5, 3.5, 1),
      createPlayer("human-2", 2.2, 3.2, 2),
    ]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.players.get("human-1")!.paintCount).toBe(0);
  });

  it("同一セルに同一チームが重なった場合は先に処理したプレイヤーのみ加算すること", () => {
    const harness = createHarness([
      createPlayer("human-1", 2.5, 3.5, 1),
      createPlayer("human-2", 2.2, 3.2, 1),
    ]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect([
      harness.players.get("human-1")!.paintCount,
      harness.players.get("human-2")!.paintCount,
    ]).toEqual([1, 0]);
  });

  it("マップ範囲外のプレイヤーはセルを塗らないこと", () => {
    const harness = createHarness([createPlayer("human-1", -1, 3.5, 1)]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(getTickData(harness.onTick).cellUpdates).toEqual([]);
  });
});

describe("GameLoop.updateBotPlayers", () => {
  it("Botプレイヤーを目標セルへ向けて移動させること", () => {
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.5, 0.5)]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    const bot = harness.players.get(BOT_PLAYER_ID)!;
    expect(bot.x).toBeCloseTo(0.5, 10);
    expect(bot.y).toBeCloseTo(0.65, 10);
  });

  it("人間プレイヤーの位置を変更しないこと", () => {
    const harness = createHarness([createPlayer("human-1", 2.5, 3.5, 1)]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    const human = harness.players.get("human-1")!;
    expect([human.x, human.y]).toEqual([2.5, 3.5]);
  });

  it("Botが爆弾設置を決定した場合にonBotPlaceBombを呼ぶこと", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.5, 0.5)]);
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.onBotPlaceBomb).toHaveBeenCalledWith(BOT_PLAYER_ID, {
      requestId: `bot-${BOT_PLAYER_ID}-1`,
      x: 0.65,
      y: 0.5,
      explodeAtElapsedMs: TICK_RATE_MS + 1000,
    });
  });

  it("爆弾設置コールバック未指定でも例外を投げないこと", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.5, 0.5)], {
      omitBotPlaceBomb: true,
    });
    harness.loop.start();

    expect(() => runNextTickCycle(TICK_RATE_MS)).not.toThrow();
  });

  it("Bot制御へ昇格した人間プレイヤーを移動させること", () => {
    const harness = createHarness([createPlayer("human-1", 0.5, 0.5)]);
    harness.loop.promotePlayerToBotControl("human-1");
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.players.get("human-1")!.y).toBeCloseTo(0.65, 10);
  });

  it("Bot制御を解除した人間プレイヤーを移動させないこと", () => {
    const harness = createHarness([createPlayer("human-1", 0.5, 0.5)]);
    harness.loop.promotePlayerToBotControl("human-1");
    harness.loop.releaseBotControl("human-1");
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.players.get("human-1")!.y).toBe(0.5);
  });
});

describe("GameLoop.detectBotBombHits", () => {
  it("爆発済み爆弾が敵チームのBotに当たった場合にonBotBombHitを呼ぶこと", () => {
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.5, 0.5, 0)]);
    harness.activeBombRegistry.registerBomb(createBomb());
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.onBotBombHit).toHaveBeenCalledWith(BOT_PLAYER_ID, "bomb-1");
  });

  it("爆弾所有者のbombHitCountを加算すること", () => {
    const harness = createHarness([
      createPlayer(BOT_PLAYER_ID, 0.5, 0.5, 0),
      createPlayer("human-1", 8.5, 8.5, 1),
    ]);
    harness.activeBombRegistry.registerBomb(createBomb());
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.players.get("human-1")!.bombHitCount).toBe(1);
  });

  it("同チームの爆弾ではonBotBombHitを呼ばないこと", () => {
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.5, 0.5, 1)]);
    harness.activeBombRegistry.registerBomb(createBomb({ ownerTeamId: 1 }));
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.onBotBombHit).not.toHaveBeenCalled();
  });

  it("人間プレイヤーには爆弾被弾判定を行わないこと", () => {
    const harness = createHarness([createPlayer("human-1", 0.5, 0.5, 0)]);
    harness.activeBombRegistry.registerBomb(createBomb());
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.onBotBombHit).not.toHaveBeenCalled();
  });

  it("爆発済み爆弾はヒットしなくてもレジストリから回収すること", () => {
    const harness = createHarness([createPlayer("human-1", 0.5, 0.5, 0)]);
    harness.activeBombRegistry.registerBomb(createBomb());
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.activeBombRegistry.getActiveBombSnapshots()).toEqual([]);
  });

  it("爆発時刻未到達の爆弾は判定対象にしないこと", () => {
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.5, 0.5, 0)]);
    harness.activeBombRegistry.registerBomb(
      createBomb({ explodeAtElapsedMs: 10_000 }),
    );
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.onBotBombHit).not.toHaveBeenCalled();
    expect(harness.activeBombRegistry.getActiveBombSnapshots()).toHaveLength(1);
  });

  it("被弾コールバック未指定の場合は爆発済み爆弾を回収しないこと", () => {
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.5, 0.5, 0)], {
      omitBotBombHit: true,
    });
    harness.activeBombRegistry.registerBomb(createBomb());
    harness.loop.start();

    runNextTickCycle(TICK_RATE_MS);

    expect(harness.activeBombRegistry.getActiveBombSnapshots()).toHaveLength(1);
  });
});

describe("GameLoop.detectHurricaneHits", () => {
  it("出現しきい値へ到達したtickでハリケーンの全量同期を配信すること", () => {
    const harness = createHarness([createPlayer("human-1", 5, 5, 0)]);
    harness.loop.start();

    runNextTickCycle(60_000);

    expect(getTickData(harness.onTick).hurricaneSync.currentUpdates).toHaveLength(5);
  });

  it("ハリケーンに接触したプレイヤーIDでonHurricanePlayerHitを呼ぶこと", () => {
    const harness = createHarness([createPlayer("human-1", 5, 5, 0)]);
    harness.loop.start();

    runNextTickCycle(60_000);

    expect(harness.onHurricanePlayerHit).toHaveBeenCalledWith("human-1");
  });

  it("接触していないプレイヤーではonHurricanePlayerHitを呼ばないこと", () => {
    const harness = createHarness([createPlayer("human-1", 9.5, 9.5, 0)]);
    harness.loop.start();

    runNextTickCycle(60_000);

    expect(harness.onHurricanePlayerHit).not.toHaveBeenCalled();
  });

  it("被弾コールバック未指定でも例外を投げないこと", () => {
    const harness = createHarness([createPlayer("human-1", 5, 5, 0)], {
      omitHurricanePlayerHit: true,
    });
    harness.loop.start();

    expect(() => runNextTickCycle(60_000)).not.toThrow();
  });

  it("出現しきい値の手前ではハリケーンを生成しないこと", () => {
    const harness = createHarness([createPlayer("human-1", 5, 5, 0)]);
    harness.loop.start();

    runNextTickCycle(59_999);

    expect(getTickData(harness.onTick).hurricaneSync.currentUpdates).toEqual([]);
  });
});

describe("GameLoop.warmUp", () => {
  it("Botプレイヤーの座標を変更しないこと", () => {
    const harness = createHarness([createPlayer(BOT_PLAYER_ID, 0.9, 0.9)]);

    harness.loop.warmUp();

    const bot = harness.players.get(BOT_PLAYER_ID)!;
    expect([bot.x, bot.y]).toEqual([0.9, 0.9]);
  });

  it("人間プレイヤーのみの場合でも例外を投げないこと", () => {
    const harness = createHarness([createPlayer("human-1", 2.5, 3.5, 1)]);

    expect(() => harness.loop.warmUp()).not.toThrow();
  });

  it("初回tickのBot移動先をwarmUpなしの場合と変えること", () => {
    const withWarmUp = createHarness([createPlayer(BOT_PLAYER_ID, 0.9, 0.9)]);
    const withoutWarmUp = createHarness([createPlayer(BOT_PLAYER_ID, 0.9, 0.9)]);

    withWarmUp.loop.warmUp();
    withWarmUp.loop.start();
    runNextTickCycle(TICK_RATE_MS);
    withWarmUp.loop.stop();

    currentPerfMs = 0;
    withoutWarmUp.loop.start();
    runNextTickCycle(TICK_RATE_MS);

    expect(withWarmUp.players.get(BOT_PLAYER_ID)!.y).not.toBe(
      withoutWarmUp.players.get(BOT_PLAYER_ID)!.y,
    );
  });

  it("Bot制御へ昇格した人間プレイヤーもwarmUp対象とすること", () => {
    const withWarmUp = createHarness([createPlayer("human-1", 0.9, 0.9)]);
    const withoutWarmUp = createHarness([createPlayer("human-1", 0.9, 0.9)]);
    withWarmUp.loop.promotePlayerToBotControl("human-1");
    withoutWarmUp.loop.promotePlayerToBotControl("human-1");

    withWarmUp.loop.warmUp();
    withWarmUp.loop.start();
    runNextTickCycle(TICK_RATE_MS);
    withWarmUp.loop.stop();

    currentPerfMs = 0;
    withoutWarmUp.loop.start();
    runNextTickCycle(TICK_RATE_MS);

    expect(withWarmUp.players.get("human-1")!.y).not.toBe(
      withoutWarmUp.players.get("human-1")!.y,
    );
  });
});
