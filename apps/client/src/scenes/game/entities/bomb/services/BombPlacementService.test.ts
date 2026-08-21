/**
 * BombPlacementService.test
 * 自プレイヤーの爆弾設置要求生成を検証するユニットテスト
 * SPEC_03（通常4000ms／フィーバー時2000msのクールダウン，信管1000ms）を基準に検証する
 */
import { describe, expect, it } from "vitest";

import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import type { GamePlayers } from "@client/scenes/game/application/game.types";
import { BombIdRegistry } from "@client/scenes/game/entities/bomb/BombIdRegistry";
import {
  LocalPlayerController,
  RemotePlayerController,
} from "@client/scenes/game/entities/player/PlayerController";
import { BombPlacementService } from "./BombPlacementService";

// SPEC_03「ボム設置」のクールダウン仕様に基づく期待値
const NORMAL_COOLDOWN_MS = 4_000;
const FEVER_COOLDOWN_MS = 2_000;
const BOMB_FUSE_MS = 1_000;

// SPEC_03「タイムライン」: 経過120秒（残り60秒）でフィーバー開始
const FEVER_START_ELAPSED_MS = 120_000;

const MY_ID = "me";

/** 経過時間を差し替えられるテスト対象一式を生成する */
const createService = (isLocalPlayer = true) => {
  const appearanceResolver = new AppearanceResolver();
  const playerData = { id: MY_ID, name: "たろう", teamId: 1, x: 3, y: 4 };
  const players: GamePlayers = {
    [MY_ID]: isLocalPlayer
      ? new LocalPlayerController(playerData, appearanceResolver)
      : new RemotePlayerController(playerData, appearanceResolver),
  };

  let elapsedMs = 0;
  const service = new BombPlacementService({
    players,
    myId: MY_ID,
    getElapsedMs: () => elapsedMs,
    appearanceResolver,
    bombIdRegistry: new BombIdRegistry(),
  });

  const placeAt = (nextElapsedMs: number) => {
    elapsedMs = nextElapsedMs;
    return service.placeOwnBomb();
  };

  return { service, placeAt };
};

describe("BombPlacementService.placeOwnBomb", () => {
  it("初回は待機なしで設置要求を返すこと", () => {
    const { placeAt } = createService();

    expect(placeAt(0)).not.toBeNull();
  });

  it("自プレイヤーがローカル操作対象でない場合は設置要求を返さないこと", () => {
    const { placeAt } = createService(false);

    expect(placeAt(0)).toBeNull();
  });

  it("設置要求には自プレイヤーの現在座標を含めること", () => {
    const { placeAt } = createService();

    expect(placeAt(0)?.payload).toMatchObject({ x: 3, y: 4 });
  });

  it("設置要求には信管時間を加えた爆発時刻を含めること", () => {
    const { placeAt } = createService();

    expect(placeAt(500)?.payload.explodeAtElapsedMs).toBe(500 + BOMB_FUSE_MS);
  });

  it("通常時はクールダウン4000msの1ms手前では設置しないこと", () => {
    const { placeAt } = createService();
    placeAt(0);

    expect(placeAt(NORMAL_COOLDOWN_MS - 1)).toBeNull();
  });

  it("通常時はクールダウン4000ms経過で設置できること", () => {
    const { placeAt } = createService();
    placeAt(0);

    expect(placeAt(NORMAL_COOLDOWN_MS)).not.toBeNull();
  });

  it("フィーバー開始前は2000ms経過では設置しないこと", () => {
    const { placeAt } = createService();
    placeAt(FEVER_START_ELAPSED_MS - NORMAL_COOLDOWN_MS);

    expect(
      placeAt(FEVER_START_ELAPSED_MS - NORMAL_COOLDOWN_MS + FEVER_COOLDOWN_MS),
    ).toBeNull();
  });

  it("フィーバー中は2000msの1ms手前では設置しないこと", () => {
    const { placeAt } = createService();
    placeAt(FEVER_START_ELAPSED_MS);

    expect(
      placeAt(FEVER_START_ELAPSED_MS + FEVER_COOLDOWN_MS - 1),
    ).toBeNull();
  });

  it("フィーバー中は2000ms経過で設置できること", () => {
    const { placeAt } = createService();
    placeAt(FEVER_START_ELAPSED_MS);

    expect(
      placeAt(FEVER_START_ELAPSED_MS + FEVER_COOLDOWN_MS),
    ).not.toBeNull();
  });

  it("設置ごとに異なる仮IDを発行すること", () => {
    const { placeAt } = createService();
    const first = placeAt(0);

    const second = placeAt(NORMAL_COOLDOWN_MS);

    expect(second?.tempBombId).not.toBe(first?.tempBombId);
  });
});
