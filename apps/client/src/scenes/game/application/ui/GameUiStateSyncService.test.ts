/**
 * GameUiStateSyncService.test
 * HUD状態の差分通知条件を検証する
 * 表示秒が変わらないフィーバー切り替えでも通知されることを保証する
 */
import { describe, expect, it } from "vitest";
import {
  GameUiStateSyncService,
  type GameHudState,
  type GameUiState,
} from "./GameUiStateSyncService";

const createHudState = (
  overrides: Partial<GameHudState> = {},
): GameHudState => {
  return {
    remainingTimeSec: 60,
    startCountdownSec: 0,
    isInputEnabled: true,
    teamPaintRates: [0, 0, 0, 0],
    localBombHitCount: 0,
    isFeverTime: false,
    ...overrides,
  };
};

const createUiState = (hud: GameHudState): GameUiState => {
  return {
    hud,
    miniMap: { mapRevision: 1, teamIds: [], localPlayerPosition: null },
  };
};

// 差し替え可能なHUD状態を返すサービスと受信履歴を用意する
const createSubscribedService = (initialHud: GameHudState) => {
  let hud = initialHud;
  const service = new GameUiStateSyncService({
    getSnapshot: () => createUiState(hud),
  });
  const received: GameHudState[] = [];
  service.subscribeHud((state) => {
    received.push(state);
  });

  return {
    received,
    emitIfChanged: () => {
      service.emitIfChanged();
    },
    setHud: (next: GameHudState) => {
      hud = next;
    },
  };
};

describe("GameUiStateSyncService", () => {
  it("HUD状態が変化しない場合は通知しないこと", () => {
    const { received, emitIfChanged } = createSubscribedService(
      createHudState(),
    );

    emitIfChanged();
    const countAfterFirstEmit = received.length;
    emitIfChanged();

    expect(received).toHaveLength(countAfterFirstEmit);
  });

  it("残り秒数が変化した場合は通知すること", () => {
    const { received, emitIfChanged, setHud } = createSubscribedService(
      createHudState(),
    );

    emitIfChanged();
    const countAfterFirstEmit = received.length;
    setHud(createHudState({ remainingTimeSec: 59 }));
    emitIfChanged();

    expect(received).toHaveLength(countAfterFirstEmit + 1);
  });

  it("残り秒数が同じでもフィーバー判定が変化した場合は通知すること", () => {
    const { received, emitIfChanged, setHud } = createSubscribedService(
      createHudState({ isFeverTime: false }),
    );

    emitIfChanged();
    const countAfterFirstEmit = received.length;
    setHud(createHudState({ isFeverTime: true }));
    emitIfChanged();

    expect(received).toHaveLength(countAfterFirstEmit + 1);
    expect(received[received.length - 1].isFeverTime).toBe(true);
  });
});
