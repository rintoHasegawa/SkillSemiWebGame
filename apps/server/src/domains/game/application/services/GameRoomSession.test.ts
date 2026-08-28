/**
 * GameRoomSession.test
 * ルームセッションの挙動を検証するユニットテスト
 * チーム割り当て，移動の無視条件，爆弾状態管理を検証する
 * 時間判定はセッションが持つ単調時計（GameClock）1本のみを基準とする
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
const { BOMB_FUSE_MS, GAME_START_DELAY_MS } = config.GAME_CONFIG;
// 仕様（SPEC_03 被弾報告のサーバ権威検証）に基づく受理猶予と距離しきい値
const { BOMB_HIT_REPORT_RETENTION_MS } = config.GAME_CONFIG;
const MAX_HIT_REPORT_DISTANCE_GRID =
  config.GAME_CONFIG.BOMB_RADIUS_GRID
  + config.GAME_CONFIG.PLAYER_RADIUS
  + config.GAME_CONFIG.BOMB_HIT_REPORT_DISTANCE_MARGIN_GRID;
const TICK_RATE_MS = 50;
const FIXED_WALL_CLOCK_MS = 1_700_000_000_000;

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

/** 単調時計を任意に進められる制御スタブ */
type MonotonicClockStub = {
  advance: (deltaMs: number) => void;
};

/** セッション内部の GameClock が読む単調時計を差し替える */
const stubMonotonicClock = (initialMs: number = 10_000): MonotonicClockStub => {
  let currentMs = initialMs;
  vi.spyOn(performance, "now").mockImplementation(() => currentMs);

  return {
    advance: (deltaMs: number) => {
      currentMs += deltaMs;
    },
  };
};

/**
 * セッションを開始し，指定のゲーム経過msまで単調時計を進める
 * 負の経過msを渡すとカウントダウン中の状態を再現できる
 */
const startSessionAtElapsed = (
  session: GameRoomSession,
  elapsedMs: number,
): MonotonicClockStub => {
  const clock = stubMonotonicClock();
  session.start(TICK_RATE_MS, createCallbacksStub());
  clock.advance(GAME_START_DELAY_MS + elapsedMs);

  return clock;
};

/** 報告者の現在地と同じ座標へ被弾報告検証用の爆弾レコードを登録する */
const registerBombAtReporter = (
  session: GameRoomSession,
  reporterId: string,
  explodeAtElapsedMs: number,
): void => {
  const reporter = session
    .getPlayers()
    .find((player) => player.id === reporterId);
  session.registerActiveBomb({
    bombId: "bomb-1",
    ownerPlayerId: "socket-owner",
    x: reporter?.x ?? 0,
    y: reporter?.y ?? 0,
    explodeAtElapsedMs,
  });
};

describe("GameRoomSession", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
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

    it("チーム希望者が走査順の後方にいても全体が均等割り当てになること", () => {
      const playerIds = Array.from(
        { length: 8 },
        (_, index) => `socket-${index + 1}`,
      );
      const teamPreferences: Record<string, number | null> = Object.fromEntries(
        playerIds.map((playerId) => [playerId, null]),
      );
      teamPreferences["socket-8"] = 0;

      const session = createSession(playerIds, {}, teamPreferences);

      const teamPopulations = Array.from(
        { length: config.GAME_CONFIG.TEAM_COUNT },
        (_, teamId) =>
          session.getPlayers().filter((player) => player.teamId === teamId)
            .length,
      );

      expect(teamPopulations).toEqual([2, 2, 2, 2]);
    });
  });

  describe("getPlayerTeamId", () => {
    it("未参加プレイヤーのチームIDは-1を返すこと", () => {
      const session = createSession();

      expect(session.getPlayerTeamId("socket-9")).toBe(-1);
    });
  });

  describe("getFieldConfig", () => {
    it("生成時に指定したフィールド設定を返すこと", () => {
      const session = createSession();

      expect(session.getFieldConfig()).toEqual(fieldConfig);
    });
  });

  describe("getSignedElapsedMs", () => {
    it("開始前は符号付き経過msが開始待機時間の負値になること", () => {
      const session = createSession();

      expect(session.getSignedElapsedMs()).toBe(-GAME_START_DELAY_MS);
    });

    it("開始直後の符号付き経過msは開始待機時間の負値になること", () => {
      const session = createSession();
      startSessionAtElapsed(session, -GAME_START_DELAY_MS);

      expect(session.getSignedElapsedMs()).toBe(-GAME_START_DELAY_MS);
      session.dispose();
    });

    it("ゲームプレイ開始時刻ちょうどの符号付き経過msは0になること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);

      expect(session.getSignedElapsedMs()).toBe(0);
      session.dispose();
    });

    it("ゲームプレイ開始後の符号付き経過msは正の経過を返すこと", () => {
      const session = createSession();
      startSessionAtElapsed(session, 1_234);

      expect(session.getSignedElapsedMs()).toBe(1_234);
      session.dispose();
    });

    it("壁時計が前方へステップしても符号付き経過msを変えないこと", () => {
      const session = createSession();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_WALL_CLOCK_MS);
      startSessionAtElapsed(session, 1_234);
      // ホストの壁時計が試合中に1時間前方へ飛ぶ状況を再現する
      nowSpy.mockReturnValue(FIXED_WALL_CLOCK_MS + 3_600_000);

      expect(session.getSignedElapsedMs()).toBe(1_234);
      session.dispose();
    });
  });

  describe("hasPlayer", () => {
    it("参加中プレイヤーの有無を判定できること", () => {
      const session = createSession();

      expect(session.hasPlayer("socket-1")).toBe(true);
    });

    it("未参加プレイヤーの有無判定はfalseを返すこと", () => {
      const session = createSession();

      expect(session.hasPlayer("socket-9")).toBe(false);
    });
  });

  describe("movePlayer", () => {
    it("未開始セッションの移動は無視すること", () => {
      const session = createSession();
      const before = { ...session.getPlayers()[0] };

      session.movePlayer("socket-1", 2.5, 3.5);

      expect(session.getPlayers()[0]).toMatchObject({
        x: before.x,
        y: before.y,
      });
    });

    it("ゲームプレイ開始後の移動は座標へ反映すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);

      session.movePlayer("socket-1", 2.5, 3.5);

      expect(session.getPlayers()[0]).toMatchObject({ x: 2.5, y: 3.5 });
      session.dispose();
    });

    it("未参加プレイヤーの移動は無視すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);
      const before = { ...session.getPlayers()[0] };

      session.movePlayer("socket-9", 2.5, 3.5);

      expect(session.getPlayers()[0]).toMatchObject({
        x: before.x,
        y: before.y,
      });
      session.dispose();
    });

    it("非有限座標の移動は無視すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);
      session.movePlayer("socket-1", 2.5, 3.5);

      session.movePlayer("socket-1", Number.NaN, 1);

      expect(session.getPlayers()[0]).toMatchObject({ x: 2.5, y: 3.5 });
      session.dispose();
    });

    it("フィールド範囲を超える移動はルームのグリッドサイズでクランプすること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);

      session.movePlayer("socket-1", 9999, 9999);

      expect(session.getPlayers()[0]).toMatchObject({
        x: fieldConfig.gridCols - PLAYER_RADIUS,
        y: fieldConfig.gridRows - PLAYER_RADIUS,
      });
      session.dispose();
    });

    it("負の座標への移動はマップ下限へクランプすること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);

      session.movePlayer("socket-1", -50, -50);

      expect(session.getPlayers()[0]).toMatchObject({
        x: PLAYER_RADIUS,
        y: PLAYER_RADIUS,
      });
      session.dispose();
    });

    it("開始直後のカウントダウン中の移動は無視すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, -GAME_START_DELAY_MS);

      session.movePlayer("socket-1", 2.5, 3.5);

      expect(session.getPlayers()[0]).not.toMatchObject({ x: 2.5, y: 3.5 });
      session.dispose();
    });

    it("ゲームプレイ開始の1ms手前の移動は無視すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, -1);

      session.movePlayer("socket-1", 2.5, 3.5);

      expect(session.getPlayers()[0]).not.toMatchObject({ x: 2.5, y: 3.5 });
      session.dispose();
    });

    it("ゲームプレイ開始時刻ちょうどの移動は座標へ反映すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);

      session.movePlayer("socket-1", 2.5, 3.5);

      expect(session.getPlayers()[0]).toMatchObject({ x: 2.5, y: 3.5 });
      session.dispose();
    });
  });

  describe("removePlayer", () => {
    it("参加中プレイヤーの削除はtrueを返すこと", () => {
      const session = createSession();

      expect(session.removePlayer("socket-1")).toBe(true);
    });

    it("未参加プレイヤーの削除はfalseを返すこと", () => {
      const session = createSession();

      expect(session.removePlayer("socket-9")).toBe(false);
    });
  });

  describe("promotePlayerToBotControl", () => {
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
      session.start(TICK_RATE_MS, createCallbacksStub());

      expect(session.promotePlayerToBotControl("socket-1")).toBe(true);
      session.dispose();
    });
  });

  describe("demotePlayerFromBotControl", () => {
    it("未参加プレイヤーのBot制御解除はfalseを返すこと", () => {
      const session = createSession();

      expect(session.demotePlayerFromBotControl("socket-9")).toBe(false);
    });

    it("未開始セッションのBot制御解除はfalseを返すこと", () => {
      const session = createSession();

      expect(session.demotePlayerFromBotControl("socket-1")).toBe(false);
    });

    it("開始済みセッションのBot制御解除はtrueを返すこと", () => {
      const session = createSession();
      session.start(TICK_RATE_MS, createCallbacksStub());

      expect(session.demotePlayerFromBotControl("socket-1")).toBe(true);
      session.dispose();
    });

    it("Bot昇格したプレイヤーを解除して人間操作へ戻せること", () => {
      const session = createSession();
      session.start(TICK_RATE_MS, createCallbacksStub());
      session.promotePlayerToBotControl("socket-1");

      expect(session.demotePlayerFromBotControl("socket-1")).toBe(true);
      session.dispose();
    });
  });

  describe("getMapGridColorsView", () => {
    it("開始前のマップ塗り状態は全セル未塗装であること", () => {
      const session = createSession();

      expect(
        session.getMapGridColorsView().every((teamId) => teamId === -1),
      ).toBe(true);
    });
  });

  describe("issueServerBombId", () => {
    it("爆弾IDを推測不能なUUIDで採番すること", () => {
      const session = createSession();

      expect(session.issueServerBombId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("採番のたびに異なる爆弾IDを返すこと", () => {
      const session = createSession();

      expect(session.issueServerBombId()).not.toBe(session.issueServerBombId());
    });
  });

  describe("shouldBroadcastBombPlaced", () => {
    it("同一キーの爆弾設置は2回目を配信不可とすること", () => {
      const session = createSession();
      session.shouldBroadcastBombPlaced("socket-1:req-1");

      expect(session.shouldBroadcastBombPlaced("socket-1:req-1")).toBe(false);
    });

    it("初回の爆弾設置は配信可とすること", () => {
      const session = createSession();

      expect(session.shouldBroadcastBombPlaced("socket-1:req-1")).toBe(true);
    });
  });

  describe("shouldAcceptBombPlacement", () => {
    it("未開始セッションの爆弾設置は受理しないこと", () => {
      const session = createSession();

      expect(session.shouldAcceptBombPlacement("socket-1")).toBe(false);
    });

    it("カウントダウン中の爆弾設置は受理しないこと", () => {
      const session = createSession();
      startSessionAtElapsed(session, -1);

      expect(session.shouldAcceptBombPlacement("socket-1")).toBe(false);
      session.dispose();
    });

    it("ゲームプレイ開始時刻ちょうどの爆弾設置は受理すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);

      expect(session.shouldAcceptBombPlacement("socket-1")).toBe(true);
      session.dispose();
    });

    it("通常クールダウン未経過の爆弾設置は受理しないこと", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 1_000);
      session.shouldAcceptBombPlacement("socket-1");

      clock.advance(100);

      expect(session.shouldAcceptBombPlacement("socket-1")).toBe(false);
      session.dispose();
    });

    it("通常クールダウン経過後の爆弾設置は受理すること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 1_000);
      session.shouldAcceptBombPlacement("socket-1");

      clock.advance(config.GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS);

      expect(session.shouldAcceptBombPlacement("socket-1")).toBe(true);
      session.dispose();
    });

    it("フィーバー時はフィーバークールダウン経過で爆弾設置を受理すること", () => {
      const session = createSession();
      // SPEC_03「タイムライン」: 残り60秒からフィーバー
      const feverElapsedMs =
        (config.GAME_CONFIG.GAME_DURATION_SEC
          - config.GAME_CONFIG.BOMB_FEVER_START_REMAINING_SEC)
          * 1_000
        + 1_000;
      const clock = startSessionAtElapsed(session, feverElapsedMs);
      session.shouldAcceptBombPlacement("socket-1");

      clock.advance(config.GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS);

      expect(session.shouldAcceptBombPlacement("socket-1")).toBe(true);
      session.dispose();
    });

    it("通常時はフィーバークールダウン経過でも爆弾設置を受理しないこと", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 10_000);
      session.shouldAcceptBombPlacement("socket-1");

      clock.advance(config.GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS);

      expect(session.shouldAcceptBombPlacement("socket-1")).toBe(false);
      session.dispose();
    });
  });

  describe("resolveBombExplodeAtElapsedMs", () => {
    it("開始前の爆発予定時刻は経過0として導火線時間を返すこと", () => {
      const session = createSession();

      expect(session.resolveBombExplodeAtElapsedMs()).toBe(BOMB_FUSE_MS);
    });

    it("開始後の爆発予定時刻はサーバー経過時間に導火線時間を加えること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 5_000);

      expect(session.resolveBombExplodeAtElapsedMs()).toBe(5_000 + BOMB_FUSE_MS);
      session.dispose();
    });

    it("カウントダウン中の爆発予定時刻は経過0として導火線時間を返すこと", () => {
      const session = createSession();
      startSessionAtElapsed(session, -1);

      expect(session.resolveBombExplodeAtElapsedMs()).toBe(BOMB_FUSE_MS);
      session.dispose();
    });

    it("壁時計が前方へステップしても爆発予定時刻を変えないこと", () => {
      const session = createSession();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_WALL_CLOCK_MS);
      startSessionAtElapsed(session, 3_000);
      // 壁時計が飛んでも爆発予定時刻はゲーム時間軸のまま据え置く（Issue #346）
      nowSpy.mockReturnValue(FIXED_WALL_CLOCK_MS + 3_600_000);

      expect(session.resolveBombExplodeAtElapsedMs()).toBe(3_000 + BOMB_FUSE_MS);
      session.dispose();
    });
  });

  it("爆発予定時刻の解決に使う時計が経過msの参照と一致すること", () => {
    const session = createSession();
    startSessionAtElapsed(session, 7_500);

    expect(session.resolveBombExplodeAtElapsedMs()).toBe(
      session.getSignedElapsedMs() + BOMB_FUSE_MS,
    );
    session.dispose();
  });

  describe("shouldBroadcastBombHitReport", () => {
    it("同一キーの被弾報告は2回目を配信不可とすること", () => {
      const session = createSession();
      session.shouldBroadcastBombHitReport("socket-1:bomb-1");

      expect(session.shouldBroadcastBombHitReport("socket-1:bomb-1")).toBe(false);
    });

    it("初回の被弾報告は配信可とすること", () => {
      const session = createSession();

      expect(session.shouldBroadcastBombHitReport("socket-1:bomb-1")).toBe(true);
    });

    it("受理猶予の内側で届いた同一キーの被弾報告を配信不可とすること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      session.shouldBroadcastBombHitReport("socket-1:bomb-1");
      clock.advance(BOMB_HIT_REPORT_RETENTION_MS - 500);

      expect(session.shouldBroadcastBombHitReport("socket-1:bomb-1")).toBe(false);
      session.dispose();
    });

    it("受理窓の終端で届いた同一キーの被弾報告を配信不可とすること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      session.shouldBroadcastBombHitReport("socket-1:bomb-1");
      clock.advance(BOMB_FUSE_MS + BOMB_HIT_REPORT_RETENTION_MS);

      expect(session.shouldBroadcastBombHitReport("socket-1:bomb-1")).toBe(false);
      session.dispose();
    });
  });

  describe("isSameTeamBombHitReport", () => {
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
  });

  describe("getActiveBombSnapshots", () => {
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
  });

  describe("recordBombHitForOwner", () => {
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
  });

  describe("checkBombHitReportOrigin", () => {
    it("設置直後（爆発前）の被弾報告を受理すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);
      registerBombAtReporter(session, "socket-1", BOMB_FUSE_MS);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });

    it("爆発予定時刻ちょうどの被弾報告を受理すること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      registerBombAtReporter(session, "socket-1", BOMB_FUSE_MS);
      clock.advance(BOMB_FUSE_MS);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });

    it("爆発後でも受理猶予の内側の被弾報告を受理すること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      registerBombAtReporter(session, "socket-1", BOMB_FUSE_MS);
      clock.advance(BOMB_FUSE_MS + BOMB_HIT_REPORT_RETENTION_MS - 1);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });

    it("爆発予定時刻＋受理猶予ちょうどの被弾報告を受理すること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      registerBombAtReporter(session, "socket-1", BOMB_FUSE_MS);
      clock.advance(BOMB_FUSE_MS + BOMB_HIT_REPORT_RETENTION_MS);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });

    it("爆発予定時刻＋受理猶予を1ms超えた被弾報告をexpiredとすること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      registerBombAtReporter(session, "socket-1", BOMB_FUSE_MS);
      clock.advance(BOMB_FUSE_MS + BOMB_HIT_REPORT_RETENTION_MS + 1);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "expired",
      });
      session.dispose();
    });

    it("未登録の爆弾IDの被弾報告をunknown_bombとすること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-unknown")).toEqual(
        { status: "unknown_bomb" },
      );
      session.dispose();
    });

    it("別セッションで登録された爆弾IDの被弾報告をunknown_bombとすること", () => {
      const otherSession = createSession();
      startSessionAtElapsed(otherSession, 0);
      registerBombAtReporter(otherSession, "socket-1", BOMB_FUSE_MS);
      const session = createSession();

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "unknown_bomb",
      });
      otherSession.dispose();
      session.dispose();
    });

    it("距離がしきい値ちょうどの被弾報告を受理すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);
      session.movePlayer("socket-1", 1, 1);
      session.registerActiveBomb({
        bombId: "bomb-1",
        ownerPlayerId: "socket-owner",
        x: 1 + MAX_HIT_REPORT_DISTANCE_GRID,
        y: 1,
        explodeAtElapsedMs: BOMB_FUSE_MS,
      });

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });

    it("距離がしきい値を超える被弾報告をtoo_farとすること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);
      session.movePlayer("socket-1", 1, 1);
      session.registerActiveBomb({
        bombId: "bomb-1",
        ownerPlayerId: "socket-owner",
        x: 1 + MAX_HIT_REPORT_DISTANCE_GRID + 0.001,
        y: 1,
        explodeAtElapsedMs: BOMB_FUSE_MS,
      });

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "too_far",
      });
      session.dispose();
    });

    it("受理猶予切れと距離超過が重なる場合はexpiredを優先すること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      session.movePlayer("socket-1", 1, 1);
      session.registerActiveBomb({
        bombId: "bomb-1",
        ownerPlayerId: "socket-owner",
        x: 1 + MAX_HIT_REPORT_DISTANCE_GRID + 1,
        y: 1,
        explodeAtElapsedMs: BOMB_FUSE_MS,
      });
      clock.advance(BOMB_FUSE_MS + BOMB_HIT_REPORT_RETENTION_MS + 1);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "expired",
      });
      session.dispose();
    });

    it("セッションに存在しない報告者の被弾報告は距離を問わず受理すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);
      session.registerActiveBomb({
        bombId: "bomb-1",
        ownerPlayerId: "socket-owner",
        x: 100,
        y: 100,
        explodeAtElapsedMs: BOMB_FUSE_MS,
      });

      expect(session.checkBombHitReportOrigin("socket-9", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });

    it("爆弾座標が非有限の場合は距離を判定せず受理すること", () => {
      const session = createSession();
      startSessionAtElapsed(session, 0);
      session.movePlayer("socket-1", 1, 1);
      session.registerActiveBomb({
        bombId: "bomb-1",
        ownerPlayerId: "socket-owner",
        x: Number.NaN,
        y: 1,
        explodeAtElapsedMs: BOMB_FUSE_MS,
      });

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });

    it("爆発予定時刻が非有限の場合は受理時刻窓を判定せず受理すること", () => {
      const session = createSession();
      const clock = startSessionAtElapsed(session, 0);
      registerBombAtReporter(session, "socket-1", Number.NaN);
      clock.advance(BOMB_FUSE_MS + BOMB_HIT_REPORT_RETENTION_MS + 10_000);

      expect(session.checkBombHitReportOrigin("socket-1", "bomb-1")).toEqual({
        status: "valid",
      });
      session.dispose();
    });
  });

  describe("dispose", () => {
    it("破棄時はプレイヤーを全て取り除くこと", () => {
      const session = createSession();

      session.dispose();

      expect(session.getPlayers()).toEqual([]);
    });
  });
});
