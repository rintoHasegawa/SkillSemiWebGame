/**
 * BotTurnOrchestrator.test
 * Bot1tick分の意思決定の現行挙動を固定する characterization test
 * 目標選択・移動・爆弾設置に加え，硬直とリスポーン，状態破棄の分岐を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPlayerEntity } from "@server/testing/playerFixtures";
import { Player } from "../../../../entities/player/Player";
import { isBotPlayerId, type BotPlayerId } from "../roster/BotRosterService.js";
import { BotTurnOrchestrator } from "./BotTurnOrchestrator.js";

type MapSize = { gridCols: number; gridRows: number };

const MAP_SIZE: MapSize = { gridCols: 10, gridRows: 10 };

// SPEC_03「タイムライン」: 経過120秒（残り60秒）でフィーバー開始
const FEVER_START_ELAPSED_MS = 120_000;

/** テスト用のBotプレイヤーIDを生成する */
const createBotPlayerId = (playerId: string): BotPlayerId => {
  if (!isBotPlayerId(playerId)) {
    throw new Error(`invalid bot player id: ${playerId}`);
  }

  return playerId;
};

const BOT_ID = createBotPlayerId("bot:room-1:1");

type PlayerParams = {
  x: number;
  y: number;
  initialX?: number;
  initialY?: number;
};

/** 座標を指定したBotプレイヤーを生成する */
const createPlayer = ({
  x,
  y,
  initialX = x,
  initialY = y,
}: PlayerParams): Player => {
  return createPlayerEntity({
    id: BOT_ID,
    name: "BOT",
    x,
    y,
    initialX,
    initialY,
  });
};

/** 全セル未塗装のグリッド色配列を生成する */
const createUnpaintedGrid = (mapSize: MapSize): number[] => {
  return Array.from({ length: mapSize.gridCols * mapSize.gridRows }, () => -1);
};

/** 目標選択と爆弾設置の乱数を固定する */
const mockRandomSequence = (values: number[], fallback: number) => {
  const spy = vi.spyOn(Math, "random");
  values.forEach((value) => {
    spy.mockReturnValueOnce(value);
  });
  spy.mockReturnValue(fallback);

  return spy;
};

/** オーケストレータと，全tick共通の引数を補う decide 呼び出しを生成する */
const createContext = (mapSize: MapSize = MAP_SIZE) => {
  const orchestrator = new BotTurnOrchestrator(mapSize);
  const gridColors = createUnpaintedGrid(mapSize);

  // BOT_ID とグリッドはテスト間で変化しないため呼び出し側から隠す
  const decide = (player: PlayerParams, nowMs: number, elapsedMs: number) => {
    return orchestrator.decide(
      BOT_ID,
      createPlayer(player),
      gridColors,
      nowMs,
      elapsedMs,
    );
  };

  return { orchestrator, decide };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BotTurnOrchestrator.decide", () => {
  it("目標セル中心に到達している場合は隣接セルを選び直して移動すること", () => {
    mockRandomSequence([0, 0], 0.9);
    const { decide } = createContext();

    const decision = decide({ x: 0.5, y: 0.5 }, 1_000, 0);

    expect(decision.nextX).toBeCloseTo(0.65, 6);
    expect(decision.nextY).toBeCloseTo(0.5, 6);
  });

  it("選択された隣接セルの方向へ移動すること", () => {
    mockRandomSequence([0, 0.3], 0.9);
    const { decide } = createContext();

    const decision = decide({ x: 5.5, y: 5.5 }, 1_000, 0);

    expect(decision.nextX).toBeCloseTo(5.35, 6);
    expect(decision.nextY).toBeCloseTo(5.5, 6);
  });

  it("目標セルへ未到達の場合は同じ目標へ向かい続けること", () => {
    mockRandomSequence([0, 0], 0.9);
    const { decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);

    const decision = decide({ x: 0.65, y: 0.5 }, 1_050, 50);

    expect(decision.nextX).toBeCloseTo(0.8, 6);
    expect(decision.nextY).toBeCloseTo(0.5, 6);
  });

  it("移動候補セルが無い場合は現在セル中心へ吸着すること", () => {
    mockRandomSequence([], 0.9);
    const { decide } = createContext({ gridCols: 1, gridRows: 1 });

    const decision = decide({ x: 0.5, y: 0.6 }, 1_000, 0);

    expect(decision.nextX).toBe(0.5);
    expect(decision.nextY).toBe(0.5);
  });

  it("目標セル中心へ到達した次tickでは別の隣接セルを選び直すこと", () => {
    mockRandomSequence([0, 0], 0.9);
    const { decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);

    const decision = decide({ x: 1.4, y: 0.5 }, 1_050, 50);

    expect(decision.nextX).toBeCloseTo(1.414_926, 5);
    expect(decision.nextY).toBeCloseTo(0.649_256, 5);
  });

  it("グリッド範囲外の座標はグリッド内へクランプして返すこと", () => {
    mockRandomSequence([], 0.9);
    const { decide } = createContext();

    const decision = decide({ x: 15, y: 15 }, 1_000, 0);

    expect(decision.nextX).toBeCloseTo(9.999, 6);
    expect(decision.nextY).toBeCloseTo(9.999, 6);
  });

  it("負座標の場合は0へクランプして返すこと", () => {
    mockRandomSequence([], 0.9);
    const { decide } = createContext();

    const decision = decide({ x: -3, y: -3 }, 1_000, 0);

    expect(decision.nextX).toBe(0);
    expect(decision.nextY).toBe(0);
  });

  it("設置確率を満たす場合は移動後座標の爆弾設置ペイロードを返すこと", () => {
    mockRandomSequence([0, 0, 0.01], 0.9);
    const { decide } = createContext();

    const decision = decide({ x: 0.5, y: 0.5 }, 1_000, 500);

    expect(decision.placeBombPayload).toEqual({
      requestId: `bot-${BOT_ID}-1`,
      x: expect.closeTo(0.65, 6),
      y: 0.5,
      explodeAtElapsedMs: 1_500,
    });
  });

  it("設置確率を満たさない場合は爆弾設置ペイロードを返さないこと", () => {
    mockRandomSequence([0, 0], 0.9);
    const { decide } = createContext();

    const decision = decide({ x: 0.5, y: 0.5 }, 1_000, 0);

    expect(decision.placeBombPayload).toBeNull();
  });

  it("クールダウン中は爆弾設置ペイロードを返さないこと", () => {
    mockRandomSequence([], 0.01);
    const { decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);

    const decision = decide({ x: 0.65, y: 0.5 }, 4_999, 3_999);

    expect(decision.placeBombPayload).toBeNull();
  });

  it("クールダウン経過時は連番を進めた爆弾設置ペイロードを返すこと", () => {
    mockRandomSequence([], 0.01);
    const { decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);

    const decision = decide({ x: 0.65, y: 0.5 }, 5_000, 4_000);

    expect(decision.placeBombPayload?.requestId).toBe(`bot-${BOT_ID}-2`);
  });

  it("フィーバー中は2000ms経過で爆弾を設置できること", () => {
    mockRandomSequence([], 0.01);
    const { decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, FEVER_START_ELAPSED_MS);

    const decision = decide(
      { x: 0.65, y: 0.5 },
      3_000,
      FEVER_START_ELAPSED_MS + 2_000,
    );

    expect(decision.placeBombPayload?.requestId).toBe(`bot-${BOT_ID}-2`);
  });

  it("フィーバー中でも2000ms未満は爆弾を設置しないこと", () => {
    mockRandomSequence([], 0.01);
    const { decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, FEVER_START_ELAPSED_MS);

    const decision = decide(
      { x: 0.65, y: 0.5 },
      2_999,
      FEVER_START_ELAPSED_MS + 1_999,
    );

    expect(decision.placeBombPayload).toBeNull();
  });

  it("フィーバー前は2000ms経過でも爆弾を設置しないこと", () => {
    mockRandomSequence([], 0.01);
    const { decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, FEVER_START_ELAPSED_MS - 2_001);

    const decision = decide(
      { x: 0.65, y: 0.5 },
      3_000,
      FEVER_START_ELAPSED_MS - 1,
    );

    expect(decision.placeBombPayload).toBeNull();
  });

  it("硬直中は現在座標を維持すること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);
    orchestrator.applyHitStun(BOT_ID, 1_000);

    const decision = decide({ x: 0.65, y: 0.5 }, 1_500, 500);

    expect(decision.nextX).toBe(0.65);
    expect(decision.nextY).toBe(0.5);
  });

  it("硬直中は爆弾を設置しないこと", () => {
    mockRandomSequence([], 0.01);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);
    orchestrator.applyHitStun(BOT_ID, 1_000);

    const decision = decide({ x: 0.65, y: 0.5 }, 1_500, 500);

    expect(decision.placeBombPayload).toBeNull();
  });

  it("硬直終了時刻に達した場合は移動を再開すること", () => {
    mockRandomSequence([0, 0], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);
    orchestrator.applyHitStun(BOT_ID, 1_000);

    const decision = decide({ x: 0.65, y: 0.5 }, 2_000, 1_000);

    expect(decision.nextX).toBeCloseTo(0.8, 6);
  });
});

describe("BotTurnOrchestrator.applyHitStun", () => {
  it("状態未生成のBotにも硬直を適用すること", () => {
    mockRandomSequence([0, 0], 0.9);
    const { orchestrator, decide } = createContext();
    orchestrator.applyHitStun(BOT_ID, 1_000);

    const decision = decide({ x: 0.5, y: 0.5 }, 1_500, 500);

    expect(decision.nextX).toBe(0.5);
    expect(decision.nextY).toBe(0.5);
  });

  it("既存の硬直終了時刻より早い被弾では硬直を短縮しないこと", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);
    orchestrator.applyHitStun(BOT_ID, 1_000);
    orchestrator.applyHitStun(BOT_ID, 500);

    const decision = decide({ x: 0.65, y: 0.5 }, 1_999, 999);

    expect(decision.nextX).toBe(0.65);
  });
});

describe("BotTurnOrchestrator.applyRespawnStun", () => {
  it("状態未生成のBotでもリスポーン時刻までは現在座標を維持すること", () => {
    mockRandomSequence([0, 0], 0.9);
    const { orchestrator, decide } = createContext();
    orchestrator.applyRespawnStun(BOT_ID, 1_000);

    const decision = decide(
      { x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 },
      1_500,
      500,
    );

    expect(decision.nextX).toBe(0.5);
    expect(decision.nextY).toBe(0.5);
  });

  it("リスポーン時刻前は現在座標を維持すること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);

    const decision = decide(
      { x: 0.65, y: 0.5, initialX: 5.5, initialY: 5.5 },
      2_999,
      1_999,
    );

    expect(decision.nextX).toBe(0.65);
    expect(decision.nextY).toBe(0.5);
  });

  it("リスポーン時刻に達した場合は初期座標へ戻すこと", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);

    const decision = decide(
      { x: 0.65, y: 0.5, initialX: 5.5, initialY: 5.5 },
      3_000,
      2_000,
    );

    expect(decision.nextX).toBe(5.5);
    expect(decision.nextY).toBe(5.5);
  });

  it("リスポーン時は爆弾を設置しないこと", () => {
    mockRandomSequence([], 0.01);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);

    const decision = decide(
      { x: 0.65, y: 0.5, initialX: 5.5, initialY: 5.5 },
      3_000,
      2_000,
    );

    expect(decision.placeBombPayload).toBeNull();
  });

  it("リスポーン後は初期位置セルを目標として移動すること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);
    decide({ x: 0.65, y: 0.5, initialX: 5.5, initialY: 5.5 }, 3_000, 2_000);

    const decision = decide(
      { x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 },
      3_001,
      2_001,
    );

    expect(decision.nextX).toBeCloseTo(0.606_066, 5);
    expect(decision.nextY).toBeCloseTo(0.606_066, 5);
  });

  it("リスポーンは一度適用されると次tickでは繰り返さないこと", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);
    decide({ x: 0.65, y: 0.5, initialX: 5.5, initialY: 5.5 }, 3_000, 2_000);

    const decision = decide(
      { x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 },
      3_001,
      2_001,
    );

    expect(decision.nextX).not.toBe(5.5);
  });

  it("状態未生成のBotでもリスポーン時刻に達すれば初期座標へ戻すこと", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    orchestrator.applyRespawnStun(BOT_ID, 1_000);

    const decision = decide(
      { x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 },
      3_000,
      2_000,
    );

    expect(decision.nextX).toBe(5.5);
    expect(decision.nextY).toBe(5.5);
  });

  it("初期座標が負の場合はマップ下限へクランプして戻すこと", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: -5, initialY: -5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);

    const decision = decide(
      { x: 0.65, y: 0.5, initialX: -5, initialY: -5 },
      3_000,
      2_000,
    );

    expect(decision.nextX).toBe(0.5);
    expect(decision.nextY).toBe(0.5);
  });

  it("初期座標がグリッドを超える場合はマップ上限へクランプして戻すこと", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 99, initialY: 99 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);

    const decision = decide(
      { x: 0.65, y: 0.5, initialX: 99, initialY: 99 },
      3_000,
      2_000,
    );

    expect(decision.nextX).toBe(9.5);
    expect(decision.nextY).toBe(9.5);
  });

  it("初期座標がグリッド外でもクランプ後座標のセルを目標にすること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 99, initialY: 99 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);
    decide({ x: 0.65, y: 0.5, initialX: 99, initialY: 99 }, 3_000, 2_000);

    const decision = decide(
      { x: 5.5, y: 9.5, initialX: 99, initialY: 99 },
      3_050,
      2_050,
    );

    expect(decision.nextX).toBeCloseTo(5.65, 6);
    expect(decision.nextY).toBeCloseTo(9.5, 6);
  });

  it("初期座標が負でもクランプ後座標のセルを目標にすること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: -5, initialY: -5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);
    decide({ x: 0.65, y: 0.5, initialX: -5, initialY: -5 }, 3_000, 2_000);

    const decision = decide(
      { x: 5.5, y: 0.5, initialX: -5, initialY: -5 },
      3_050,
      2_050,
    );

    expect(decision.nextX).toBeCloseTo(5.35, 6);
    expect(decision.nextY).toBeCloseTo(0.5, 6);
  });

  it("初回decideがリスポーンtickと重なった場合も初期位置セルを目標にすること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    orchestrator.applyRespawnStun(BOT_ID, 1_000);
    decide({ x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 }, 3_000, 2_000);

    const decision = decide(
      { x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 },
      3_050,
      2_050,
    );

    expect(decision.nextX).toBeCloseTo(0.606_066, 5);
    expect(decision.nextY).toBeCloseTo(0.606_066, 5);
  });
});

describe("BotTurnOrchestrator.overrideTarget", () => {
  it("上書きした目標セルへ向かって移動すること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);
    orchestrator.overrideTarget(BOT_ID, 5, 5);

    const decision = decide({ x: 0.5, y: 0.5 }, 1_050, 50);

    expect(decision.nextX).toBeCloseTo(0.606_066, 5);
    expect(decision.nextY).toBeCloseTo(0.606_066, 5);
  });

  it("状態未生成のBotには目標を上書きしないこと", () => {
    mockRandomSequence([0, 0], 0.9);
    const { orchestrator, decide } = createContext();
    orchestrator.overrideTarget(BOT_ID, 5, 5);

    const decision = decide({ x: 0.5, y: 0.5 }, 1_000, 0);

    expect(decision.nextX).toBeCloseTo(0.65, 6);
    expect(decision.nextY).toBeCloseTo(0.5, 6);
  });
});

describe("BotTurnOrchestrator.clear", () => {
  it("clear後は保持していた目標状態を破棄すること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);
    orchestrator.overrideTarget(BOT_ID, 5, 5);
    orchestrator.clear();

    const decision = decide({ x: 0.5, y: 0.5 }, 1_050, 50);

    expect(decision.nextX).toBe(0.5);
    expect(decision.nextY).toBeCloseTo(0.65, 6);
  });

  it("clear後はリスポーン予約も破棄すること", () => {
    mockRandomSequence([], 0.9);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 }, 1_000, 0);
    orchestrator.applyRespawnStun(BOT_ID, 1_000);
    orchestrator.clear();

    const decision = decide(
      { x: 0.5, y: 0.5, initialX: 5.5, initialY: 5.5 },
      3_000,
      2_000,
    );

    expect(decision.nextX).not.toBe(5.5);
  });

  it("clear後は爆弾クールダウンも初期化されること", () => {
    mockRandomSequence([], 0.01);
    const { orchestrator, decide } = createContext();
    decide({ x: 0.5, y: 0.5 }, 1_000, 0);
    orchestrator.clear();

    const decision = decide({ x: 0.65, y: 0.5 }, 1_050, 50);

    expect(decision.placeBombPayload?.requestId).toBe(`bot-${BOT_ID}-1`);
  });
});
