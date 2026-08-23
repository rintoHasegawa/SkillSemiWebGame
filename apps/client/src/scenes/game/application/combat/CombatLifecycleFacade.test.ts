/**
 * CombatLifecycleFacade.test
 * ネットワーク被弾通知（PLAYER_HIT）適用時の入力ロック挙動を検証する
 * リスポーン中の自分宛通知でリスポーン硬直が短縮されないことを確認する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@client/config";
import type { GamePlayers } from "@client/scenes/game/application/game.types";
import { CombatLifecycleFacade } from "./CombatLifecycleFacade";

const MY_ID = "me";
const HIT_STUN_MS = config.GAME_CONFIG.PLAYER_HIT_STUN_MS;
const RESPAWN_STUN_MS = config.GAME_CONFIG.PLAYER_RESPAWN_STUN_MS;
const RESPAWN_HIT_COUNT = config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT;

/** 入力ロックの取得・解放を記録するファサードを生成する */
const createFacade = () => {
  const release = vi.fn();
  const acquireInputLock = vi.fn(() => release);
  const facade = new CombatLifecycleFacade({
    players: {} as GamePlayers,
    myId: MY_ID,
    acquireInputLock,
    onSendBombHitReport: vi.fn(),
    onLocalBombHitCountChanged: vi.fn(),
  });

  return { facade, acquireInputLock, release };
};

/** 自分宛の PLAYER_HIT を指定回数適用する */
const hitSelf = (facade: CombatLifecycleFacade, times: number) => {
  for (let i = 0; i < times; i += 1) {
    facade.handleNetworkPlayerHit({ playerId: MY_ID });
  }
};

describe("CombatLifecycleFacade", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("リスポーン中でない自分宛 PLAYER_HIT では PLAYER_HIT_STUN_MS 後に入力ロックを解放すること", () => {
    const { facade, acquireInputLock, release } = createFacade();

    hitSelf(facade, 1);

    expect(acquireInputLock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(HIT_STUN_MS - 1);
    expect(release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(release).toHaveBeenCalledTimes(1);

    facade.dispose();
  });

  it("リスポーン中に届いた自分宛 PLAYER_HIT でリスポーン硬直が短縮されないこと", () => {
    // 前提: リスポーン硬直は被弾硬直より長い（短縮が観測できる）
    expect(RESPAWN_STUN_MS).toBeGreaterThan(HIT_STUN_MS);
    const { facade, release } = createFacade();

    hitSelf(facade, RESPAWN_HIT_COUNT);
    // リスポーン中に遅れて届いた自分宛 PLAYER_HIT
    hitSelf(facade, 1);

    vi.advanceTimersByTime(HIT_STUN_MS);
    expect(release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(RESPAWN_STUN_MS - HIT_STUN_MS);
    expect(release).toHaveBeenCalledTimes(1);

    facade.dispose();
  });
});
