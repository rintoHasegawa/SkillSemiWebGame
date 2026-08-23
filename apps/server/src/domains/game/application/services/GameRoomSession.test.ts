/**
 * GameRoomSession.test
 * ルームセッションの現行挙動を固定する characterization test
 * チーム割り当て，移動の無視条件，爆弾状態管理を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@server/config";

import type { GameFieldConfig } from "../ports/gameUseCasePorts";
import { GameRoomSession, type GameSessionCallbacks } from "./GameRoomSession";

const fieldConfig: GameFieldConfig = {
  fieldSizePreset: "SMALL",
  gridCols: 6,
  gridRows: 6,
};

// 仕様（SPEC_03 プレイヤー半径 0.5 グリッド）に基づく境界値
const { PLAYER_RADIUS } = config.GAME_CONFIG;

/** テスト用のセッションを生成する */
const createSession = (
  playerIds: string[] = ["socket-1"],
  playerNamesById: Record<string, string> = { "socket-1": "太郎" },
  teamPreferences?: Record<string, number | null>,
): GameRoomSession => {
  return new GameRoomSession(
    "room-1",
    playerIds,
    playerNamesById,
    fieldConfig,
    teamPreferences,
  );
};

/** start用のコールバックスタブを生成する */
const createCallbacksStub = (): GameSessionCallbacks => {
  return {
    onTick: vi.fn(),
    onGameEnd: vi.fn(),
  };
};

describe("GameRoomSession", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("指定したプレイヤーを全員セッションへ登録すること", () => {
    const session = createSession(["socket-1", "socket-2"], {});

    expect(session.getPlayers().map((player) => player.id)).toEqual([
      "socket-1",
      "socket-2",
    ]);
  });

  it("プレイヤー名が未指定の場合はIDを名前に使うこと", () => {
    const session = createSession(["socket-1"], {});

    expect(session.getPlayers()[0]?.name).toBe("socket-1");
  });

  it("チーム希望がある場合はその値を割り当てること", () => {
    const session = createSession(["socket-1"], {}, { "socket-1": 2 });

    expect(session.getPlayerTeamId("socket-1")).toBe(2);
  });

  it("チーム希望がnullの場合は均等割り当てを行うこと", () => {
    const session = createSession(
      ["socket-1", "socket-2"],
      {},
      { "socket-1": null, "socket-2": null },
    );

    expect(
      session.getPlayers().map((player) => player.teamId),
    ).toEqual([0, 1]);
  });

  it("チーム希望が未指定の場合も均等割り当てを行うこと", () => {
    const session = createSession(["socket-1", "socket-2", "socket-3"], {});

    expect(
      session.getPlayers().map((player) => player.teamId),
    ).toEqual([0, 1, 2]);
  });

  it("未参加プレイヤーのチームIDは-1を返すこと", () => {
    const session = createSession();

    expect(session.getPlayerTeamId("socket-9")).toBe(-1);
  });

  it("生成時に指定したフィールド設定を返すこと", () => {
    const session = createSession();

    expect(session.getFieldConfig()).toEqual(fieldConfig);
  });

  it("開始前は開始時刻がundefinedであること", () => {
    const session = createSession();

    expect(session.getStartTime()).toBeUndefined();
  });

  it("参加中プレイヤーの有無を判定できること", () => {
    const session = createSession();

    expect(session.hasPlayer("socket-1")).toBe(true);
  });

  it("未参加プレイヤーの有無判定はfalseを返すこと", () => {
    const session = createSession();

    expect(session.hasPlayer("socket-9")).toBe(false);
  });

  it("開始前の移動は座標へ反映すること", () => {
    const session = createSession();

    session.movePlayer("socket-1", 2.5, 3.5);

    expect(session.getPlayers()[0]).toMatchObject({ x: 2.5, y: 3.5 });
  });

  it("未参加プレイヤーの移動は無視すること", () => {
    const session = createSession();
    const before = { ...session.getPlayers()[0] };

    session.movePlayer("socket-9", 2.5, 3.5);

    expect(session.getPlayers()[0]).toMatchObject({
      x: before.x,
      y: before.y,
    });
  });

  it("非有限座標の移動は無視すること", () => {
    const session = createSession();
    session.movePlayer("socket-1", 2.5, 3.5);

    session.movePlayer("socket-1", Number.NaN, 1);

    expect(session.getPlayers()[0]).toMatchObject({ x: 2.5, y: 3.5 });
  });

  it("フィールド範囲を超える移動はルームのグリッドサイズでクランプすること", () => {
    const session = createSession();

    session.movePlayer("socket-1", 9999, 9999);

    expect(session.getPlayers()[0]).toMatchObject({
      x: fieldConfig.gridCols - PLAYER_RADIUS,
      y: fieldConfig.gridRows - PLAYER_RADIUS,
    });
  });

  it("負の座標への移動はマップ下限へクランプすること", () => {
    const session = createSession();

    session.movePlayer("socket-1", -50, -50);

    expect(session.getPlayers()[0]).toMatchObject({
      x: PLAYER_RADIUS,
      y: PLAYER_RADIUS,
    });
  });

  it("開始待機中の移動は無視すること", () => {
    const session = createSession();
    session.start(50, createCallbacksStub());

    session.movePlayer("socket-1", 2.5, 3.5);

    expect(session.getPlayers()[0]).not.toMatchObject({ x: 2.5, y: 3.5 });
    session.dispose();
  });

  it("開始時刻が0でも開始前の移動は無視すること", () => {
    const session = createSession();
    // 待機時間を差し引いて開始時刻がエポック0になるよう現在時刻を固定する
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(-config.GAME_CONFIG.GAME_START_DELAY_MS);
    session.start(50, createCallbacksStub());
    nowSpy.mockReturnValue(-1);

    session.movePlayer("socket-1", 2.5, 3.5);

    expect(session.getPlayers()[0]).not.toMatchObject({ x: 2.5, y: 3.5 });
    session.dispose();
  });

  it("開始時刻が0ちょうどに達した移動は座標へ反映すること", () => {
    const session = createSession();
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(-config.GAME_CONFIG.GAME_START_DELAY_MS);
    session.start(50, createCallbacksStub());
    nowSpy.mockReturnValue(0);

    session.movePlayer("socket-1", 2.5, 3.5);

    expect(session.getPlayers()[0]).toMatchObject({ x: 2.5, y: 3.5 });
    session.dispose();
  });

  it("開始時は待機時間を加えた開始時刻を設定すること", () => {
    const session = createSession();
    const beforeMs = Date.now();

    session.start(50, createCallbacksStub());

    expect(session.getStartTime()).toBeGreaterThan(beforeMs);
    session.dispose();
  });

  it("参加中プレイヤーの削除はtrueを返すこと", () => {
    const session = createSession();

    expect(session.removePlayer("socket-1")).toBe(true);
  });

  it("未参加プレイヤーの削除はfalseを返すこと", () => {
    const session = createSession();

    expect(session.removePlayer("socket-9")).toBe(false);
  });

  it("未参加プレイヤーのBot昇格はfalseを返すこと", () => {
    const session = createSession();

    expect(session.promotePlayerToBotControl("socket-9")).toBe(false);
  });

  it("未開始セッションのBot昇格はfalseを返すこと", () => {
    const session = createSession();

    expect(session.promotePlayerToBotControl("socket-1")).toBe(false);
  });

  it("開始済みセッションのBot昇格はtrueを返すこと", () => {
    const session = createSession();
    session.start(50, createCallbacksStub());

    expect(session.promotePlayerToBotControl("socket-1")).toBe(true);
    session.dispose();
  });

  it("爆弾IDを1から連番で採番すること", () => {
    const session = createSession();

    expect([session.issueServerBombId(), session.issueServerBombId()]).toEqual([
      "1",
      "2",
    ]);
  });

  it("同一キーの爆弾設置は2回目を配信不可とすること", () => {
    const session = createSession();
    session.shouldBroadcastBombPlaced("socket-1:req-1", 0);

    expect(session.shouldBroadcastBombPlaced("socket-1:req-1", 0)).toBe(false);
  });

  it("初回の爆弾設置は配信可とすること", () => {
    const session = createSession();

    expect(session.shouldBroadcastBombPlaced("socket-1:req-1", 0)).toBe(true);
  });

  it("開始待機中の爆弾設置は受理しないこと", () => {
    const session = createSession();
    // 待機時間を差し引いて開始時刻がエポック0になるよう現在時刻を固定する
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(-config.GAME_CONFIG.GAME_START_DELAY_MS);
    session.start(50, createCallbacksStub());
    nowSpy.mockReturnValue(-1);

    expect(session.shouldAcceptBombPlacement("socket-1", -1)).toBe(false);
    session.dispose();
  });

  it("開始時刻ちょうどに達した爆弾設置は受理すること", () => {
    const session = createSession();
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(-config.GAME_CONFIG.GAME_START_DELAY_MS);
    session.start(50, createCallbacksStub());
    nowSpy.mockReturnValue(0);

    expect(session.shouldAcceptBombPlacement("socket-1", 0)).toBe(true);
    session.dispose();
  });

  it("通常クールダウン未経過の爆弾設置は受理しないこと", () => {
    const session = createSession();
    session.shouldAcceptBombPlacement("socket-1", 1_000);

    expect(session.shouldAcceptBombPlacement("socket-1", 1_100)).toBe(false);
  });

  it("通常クールダウン経過後の爆弾設置は受理すること", () => {
    const session = createSession();
    session.shouldAcceptBombPlacement("socket-1", 1_000);

    expect(
      session.shouldAcceptBombPlacement(
        "socket-1",
        1_000 + config.GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS,
      ),
    ).toBe(true);
  });

  it("フィーバー時はフィーバークールダウン経過で爆弾設置を受理すること", () => {
    const session = createSession();
    vi.spyOn(Date, "now").mockReturnValue(
      -config.GAME_CONFIG.GAME_START_DELAY_MS,
    );
    session.start(50, createCallbacksStub());
    const feverElapsedMs =
      (config.GAME_CONFIG.GAME_DURATION_SEC
        - config.GAME_CONFIG.BOMB_FEVER_START_REMAINING_SEC)
        * 1_000
      + 1_000;
    session.shouldAcceptBombPlacement("socket-1", feverElapsedMs);

    expect(
      session.shouldAcceptBombPlacement(
        "socket-1",
        feverElapsedMs + config.GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS,
      ),
    ).toBe(true);
    session.dispose();
  });

  it("通常時はフィーバークールダウン経過でも爆弾設置を受理しないこと", () => {
    const session = createSession();
    vi.spyOn(Date, "now").mockReturnValue(
      -config.GAME_CONFIG.GAME_START_DELAY_MS,
    );
    session.start(50, createCallbacksStub());
    session.shouldAcceptBombPlacement("socket-1", 10_000);

    expect(
      session.shouldAcceptBombPlacement(
        "socket-1",
        10_000 + config.GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS,
      ),
    ).toBe(false);
    session.dispose();
  });

  it("開始前の爆発予定時刻は経過0として導火線時間を返すこと", () => {
    const session = createSession();

    expect(session.resolveBombExplodeAtElapsedMs(5_000)).toBe(
      config.GAME_CONFIG.BOMB_FUSE_MS,
    );
  });

  it("開始後の爆発予定時刻はサーバー経過時間に導火線時間を加えること", () => {
    const session = createSession();
    vi.spyOn(Date, "now").mockReturnValue(
      -config.GAME_CONFIG.GAME_START_DELAY_MS,
    );
    session.start(50, createCallbacksStub());

    expect(session.resolveBombExplodeAtElapsedMs(5_000)).toBe(
      5_000 + config.GAME_CONFIG.BOMB_FUSE_MS,
    );
    session.dispose();
  });

  it("開始待機中の爆発予定時刻は経過0として導火線時間を返すこと", () => {
    const session = createSession();
    vi.spyOn(Date, "now").mockReturnValue(0);
    session.start(50, createCallbacksStub());

    expect(session.resolveBombExplodeAtElapsedMs(0)).toBe(
      config.GAME_CONFIG.BOMB_FUSE_MS,
    );
    session.dispose();
  });

  it("同一キーの被弾報告は2回目を配信不可とすること", () => {
    const session = createSession();
    session.shouldBroadcastBombHitReport("socket-1:bomb-1", 0);

    expect(session.shouldBroadcastBombHitReport("socket-1:bomb-1", 0)).toBe(
      false,
    );
  });

  it("自分が設置した爆弾への被弾報告を同チーム報告と判定すること", () => {
    const session = createSession(["socket-1"], {}, { "socket-1": 0 });
    session.registerActiveBomb({
      bombId: "bomb-1",
      ownerPlayerId: "socket-1",
      x: 1,
      y: 1,
      explodeAtElapsedMs: 500,
    });

    expect(session.isSameTeamBombHitReport("socket-1", "bomb-1")).toBe(true);
  });

  it("味方が設置した爆弾への被弾報告を同チーム報告と判定すること", () => {
    const session = createSession(
      ["socket-1", "socket-2"],
      {},
      { "socket-1": 0, "socket-2": 0 },
    );
    session.registerActiveBomb({
      bombId: "bomb-1",
      ownerPlayerId: "socket-1",
      x: 1,
      y: 1,
      explodeAtElapsedMs: 500,
    });

    expect(session.isSameTeamBombHitReport("socket-2", "bomb-1")).toBe(true);
  });

  it("敵が設置した爆弾への被弾報告は同チーム報告と判定しないこと", () => {
    const session = createSession(
      ["socket-1", "socket-2"],
      {},
      { "socket-1": 0, "socket-2": 1 },
    );
    session.registerActiveBomb({
      bombId: "bomb-1",
      ownerPlayerId: "socket-1",
      x: 1,
      y: 1,
      explodeAtElapsedMs: 500,
    });

    expect(session.isSameTeamBombHitReport("socket-2", "bomb-1")).toBe(false);
  });

  it("設置者不明の爆弾への被弾報告は同チーム報告と判定しないこと", () => {
    const session = createSession(["socket-1"], {}, { "socket-1": 0 });

    expect(session.isSameTeamBombHitReport("socket-1", "bomb-unknown")).toBe(
      false,
    );
  });

  it("登録した爆弾をスナップショットで返すこと", () => {
    const session = createSession(["socket-1"], {}, { "socket-1": 2 });

    session.registerActiveBomb({
      bombId: "bomb-1",
      ownerPlayerId: "socket-1",
      x: 1,
      y: 2,
      explodeAtElapsedMs: 500,
    });

    expect(session.getActiveBombSnapshots()).toEqual([
      {
        bombId: "bomb-1",
        ownerPlayerId: "socket-1",
        ownerTeamId: 2,
        x: 1,
        y: 2,
        explodeAtElapsedMs: 500,
      },
    ]);
  });

  it("未参加プレイヤーの爆弾登録ではownerTeamIdを-1にすること", () => {
    const session = createSession();

    session.registerActiveBomb({
      bombId: "bomb-1",
      ownerPlayerId: "socket-9",
      x: 1,
      y: 2,
      explodeAtElapsedMs: 500,
    });

    expect(session.getActiveBombSnapshots()[0]?.ownerTeamId).toBe(-1);
  });

  it("被弾報告で爆弾所有者の命中数を加算すること", () => {
    const session = createSession();
    session.registerActiveBomb({
      bombId: "bomb-1",
      ownerPlayerId: "socket-1",
      x: 1,
      y: 2,
      explodeAtElapsedMs: 500,
    });

    session.recordBombHitForOwner("bomb-1");

    expect(session.getPlayers()[0]?.bombHitCount).toBe(1);
  });

  it("未登録の爆弾IDでは命中数を加算しないこと", () => {
    const session = createSession();

    session.recordBombHitForOwner("bomb-x");

    expect(session.getPlayers()[0]?.bombHitCount).toBe(0);
  });

  it("破棄時はプレイヤーを全て取り除くこと", () => {
    const session = createSession();

    session.dispose();

    expect(session.getPlayers()).toEqual([]);
  });
});
