/**
 * CombatLifecycleFacade.test
 * ネットワーク被弾通知（PLAYER_HIT）適用時の入力ロック挙動を検証する
 * リスポーン中の自分宛通知でリスポーン硬直が短縮されないことを確認する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@client/config";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import type { GamePlayers } from "@client/scenes/game/application/game.types";
import {
  LocalPlayerController,
  RemotePlayerController,
} from "@client/scenes/game/entities/player/PlayerController";
import { CombatLifecycleFacade } from "./CombatLifecycleFacade";

const MY_ID = "me";
const REMOTE_ID = "remote";
const HIT_STUN_MS = config.GAME_CONFIG.PLAYER_HIT_STUN_MS;
const RESPAWN_STUN_MS = config.GAME_CONFIG.PLAYER_RESPAWN_STUN_MS;
const RESPAWN_HIT_COUNT = config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT;

/** 入力ロックの取得・解放を記録するファサードを生成する */
const createFacade = (players: GamePlayers = {} as GamePlayers) => {
  const release = vi.fn();
  const acquireInputLock = vi.fn(() => release);
  const onLocalRespawnCompleted = vi.fn();
  const facade = new CombatLifecycleFacade({
    players,
    myId: MY_ID,
    acquireInputLock,
    onSendBombHitReport: vi.fn(),
    onLocalBombHitCountChanged: vi.fn(),
    onLocalRespawnCompleted,
  });

  return { facade, acquireInputLock, release, onLocalRespawnCompleted };
};

/** 指定座標で生成したリモートプレイヤーコントローラを返す（点滅演出は無効化する） */
const createRemotePlayer = (x: number, y: number) => {
  const player = new RemotePlayerController(
    { id: REMOTE_ID, name: "remote", teamId: 1, x, y },
    new AppearanceResolver(),
  );
  vi.spyOn(player, "playBombHitBlink").mockImplementation(() => {});
  return player;
};

/** 指定座標で生成したローカルプレイヤーコントローラを返す（点滅演出は無効化する） */
const createLocalPlayer = (x: number, y: number) => {
  const player = new LocalPlayerController(
    { id: MY_ID, name: "me", teamId: 0, x, y },
    new AppearanceResolver(),
  );
  vi.spyOn(player, "playBombHitBlink").mockImplementation(() => {});
  return player;
};

/** リモートプレイヤー宛の PLAYER_HIT を指定回数適用する */
const hitRemote = (facade: CombatLifecycleFacade, times: number) => {
  for (let i = 0; i < times; i += 1) {
    facade.handleNetworkPlayerHit({ playerId: REMOTE_ID });
  }
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
    // node 環境では PlayerView のテクスチャ読み込みが失敗し console.error が出るため抑止する
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it("リモートプレイヤーのリスポーン完了時にコントローラ生成時座標（AOI進入点）へ戻さず，サーバから受けた最新座標を保持すること", () => {
    // AOI進入点 (5,5) で生成され，その後サーバ更新で (10,10) へ移動したリモートプレイヤー
    const remote = createRemotePlayer(5, 5);
    remote.applyRemoteUpdate({ x: 10, y: 10 });
    remote.tick(1);
    expect(remote.getPosition()).toEqual({ x: 10, y: 10 });
    const { facade } = createFacade({ [REMOTE_ID]: remote });

    hitRemote(facade, RESPAWN_HIT_COUNT);
    vi.advanceTimersByTime(RESPAWN_STUN_MS);

    // リスポーン先はサーバ（UPDATE_PLAYERS）が決めるため，クライアント側で勝手に移動させない
    expect(remote.getPosition()).toEqual({ x: 10, y: 10 });

    facade.dispose();
    remote.destroy();
  });

  it("ローカルプレイヤーのリスポーン完了時に初期位置へ戻し，その座標を onLocalRespawnCompleted に通知すること", () => {
    const local = createLocalPlayer(2, 2);
    local.applyLocalInput({ axisX: 1, axisY: 1, deltaTime: 1 });
    expect(local.getPosition()).not.toEqual({ x: 2, y: 2 });
    const { facade, onLocalRespawnCompleted } = createFacade({
      [MY_ID]: local,
    });

    hitSelf(facade, RESPAWN_HIT_COUNT);
    vi.advanceTimersByTime(RESPAWN_STUN_MS);

    expect(local.getPosition()).toEqual({ x: 2, y: 2 });
    expect(onLocalRespawnCompleted).toHaveBeenCalledWith({ x: 2, y: 2 });

    facade.dispose();
    local.destroy();
  });
});
