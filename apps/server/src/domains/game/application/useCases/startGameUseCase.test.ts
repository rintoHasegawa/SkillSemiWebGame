/**
 * startGameUseCase.test
 * ゲーム開始ユースケースの挙動を検証するユニットテスト
 * セッション開始，tick配信の省略条件，終了・被弾コールバックを検証する
 * GAME_START通知は壁時計を載せず符号付きゲーム経過msのみを配信する
 */
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  GameResultPayload,
  GameStartPayload,
  HurricaneHitPayload,
  PlaceBombPayload,
  PlayerHitPayload,
  domain,
} from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@server/config";
import type {
  ActiveBombRegistration,
  GameFieldConfig,
} from "../ports/gameUseCasePorts";
import type { GameSessionCallbacks } from "../services/GameRoomSession";
import { startGameUseCase } from "./startGameUseCase";

const { GAME_START_DELAY_MS } = config.GAME_CONFIG;

const fieldConfig: GameFieldConfig = {
  fieldSizePreset: "SMALL",
  gridCols: 24,
  gridRows: 24,
};

type GameSessionStubParams = {
  /** 進行中セッションの符号付きゲーム経過ms（未開始は undefined） */
  signedElapsedMs?: number;
  sessionFieldConfig?: GameFieldConfig;
};

/** 開始セッション状態を固定した StartGamePort スタブを生成する */
const createGameSessionStub = ({
  signedElapsedMs,
  sessionFieldConfig,
}: GameSessionStubParams = {}) => {
  return {
    startRoomSession: vi.fn<
      (
        playerIds: string[],
        playerNamesById: Record<string, string>,
        config: GameFieldConfig,
        callbacks: GameSessionCallbacks,
        teamPreferences?: Record<string, number | null>,
      ) => void
    >(),
    getRoomSignedElapsedMs: vi.fn<() => number | undefined>(
      () => signedElapsedMs,
    ),
    getRoomFieldConfig: vi.fn<() => GameFieldConfig | undefined>(
      () => sessionFieldConfig,
    ),
  };
};

// サーバー経過時間から解決される爆発予定時刻（申告値と区別するため別値にする）
const SERVER_EXPLODE_AT_ELAPSED_MS = 11_000;

/** 爆弾配信可否を固定した BombPlacementPort スタブを生成する */
const createBombStoreStub = (shouldBroadcast = true) => {
  return {
    shouldBroadcastBombPlaced: vi.fn<(dedupeKey: string) => boolean>(
      () => shouldBroadcast,
    ),
    shouldAcceptBombPlacement: vi.fn<(playerId: string) => boolean>(() => true),
    issueServerBombId: vi.fn<() => string>(() => "bomb-1"),
    resolveBombExplodeAtElapsedMs: vi.fn<() => number>(
      () => SERVER_EXPLODE_AT_ELAPSED_MS,
    ),
    registerActiveBomb: vi.fn<(registration: ActiveBombRegistration) => void>(),
    getPlayerTeamId: vi.fn<(playerId: string) => number>(() => 1),
  };
};

/** 全配信呼び出しを記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishUpdatePlayersToRoom: vi.fn<
      (roomId: string, players: domain.game.tick.PlayerPositionUpdate[]) => void
    >(),
    publishMapCellUpdatesToRoom: vi.fn<
      (roomId: string, cellUpdates: domain.game.gridMap.CellUpdate[]) => void
    >(),
    publishCurrentHurricanesToRoom: vi.fn<
      (roomId: string, hurricanes: unknown[]) => void
    >(),
    publishUpdateHurricanesToRoom: vi.fn<
      (
        roomId: string,
        hurricanes: unknown[],
        activeHurricaneIds: string[],
      ) => void
    >(),
    publishGameEndToRoom: vi.fn<(roomId: string) => void>(),
    publishGameResultToRoom: vi.fn<
      (roomId: string, payload: GameResultPayload) => void
    >(),
    publishGameStartToRoom: vi.fn<
      (roomId: string, payload: GameStartPayload) => void
    >(),
    publishBombPlacedToOthersInRoom: vi.fn<
      (
        roomId: string,
        excludedSocketId: string,
        payload: BombPlacedPayload,
      ) => void
    >(),
    publishBombPlacedAckToSocket: vi.fn<
      (socketId: string, payload: BombPlacedAckPayload) => void
    >(),
    publishPlayerHitToOthersInRoom: vi.fn<
      (roomId: string, deadPlayerId: string, payload: PlayerHitPayload) => void
    >(),
    publishPlayerHitToRoom: vi.fn<
      (roomId: string, payload: PlayerHitPayload) => void
    >(),
    publishHurricaneHitToRoom: vi.fn<
      (roomId: string, payload: HurricaneHitPayload) => void
    >(),
  };
};

/** tick配信テスト用のTickDataを生成する */
const createTickData = (
  overrides: Partial<domain.game.tick.TickData> = {},
): domain.game.tick.TickData => {
  return {
    playerUpdates: [],
    cellUpdates: [],
    hurricaneSync: {
      currentUpdates: [],
      updateUpdates: [],
      activeHurricaneIds: [],
    },
    ...overrides,
  };
};

type RunStartGameParams = {
  gameSession?: ReturnType<typeof createGameSessionStub>;
  bombStore?: ReturnType<typeof createBombStoreStub>;
  output?: ReturnType<typeof createOutputStub>;
  onGameEnd?: () => void;
  teamPreferences?: Record<string, number | null>;
};

/** 既定パラメータでユースケースを実行し，注入したスタブを返す */
const runStartGameUseCase = ({
  gameSession = createGameSessionStub(),
  bombStore = createBombStoreStub(),
  output = createOutputStub(),
  onGameEnd = vi.fn(),
  teamPreferences,
}: RunStartGameParams = {}) => {
  startGameUseCase({
    roomId: "room-1",
    fieldConfig,
    playerIds: ["socket-1", "socket-2"],
    playerNamesById: { "socket-1": "太郎", "socket-2": "次郎" },
    teamPreferences,
    gameSession,
    bombStore,
    onGameEnd,
    output,
  });

  const callbacks = gameSession.startRoomSession.mock
    .calls[0]?.[3] as GameSessionCallbacks;

  return { gameSession, bombStore, output, onGameEnd, callbacks };
};

describe("startGameUseCase", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("プレイヤーIDと名前を渡してセッションを開始すること", () => {
    const { gameSession } = runStartGameUseCase();

    expect(gameSession.startRoomSession).toHaveBeenCalledWith(
      ["socket-1", "socket-2"],
      { "socket-1": "太郎", "socket-2": "次郎" },
      fieldConfig,
      expect.any(Object),
      undefined,
    );
  });

  it("フィールド設定を複製して渡すこと", () => {
    const { gameSession } = runStartGameUseCase();

    expect(gameSession.startRoomSession.mock.calls[0]?.[2]).not.toBe(
      fieldConfig,
    );
  });

  it("チーム希望を指定した場合はそのままセッションへ渡すこと", () => {
    const teamPreferences = { "socket-1": 2, "socket-2": null };
    const { gameSession } = runStartGameUseCase({ teamPreferences });

    expect(gameSession.startRoomSession.mock.calls[0]?.[4]).toEqual(
      teamPreferences,
    );
  });

  it("カウントダウン中の符号付き経過msでゲーム開始をルームへ配信すること", () => {
    const { output } = runStartGameUseCase({
      gameSession: createGameSessionStub({
        signedElapsedMs: -GAME_START_DELAY_MS,
      }),
    });

    expect(output.publishGameStartToRoom).toHaveBeenCalledWith("room-1", {
      roomId: "room-1",
      serverElapsedMs: -GAME_START_DELAY_MS,
      fieldSizePreset: "SMALL",
      gridCols: 24,
      gridRows: 24,
    });
  });

  it("ゲーム開始通知に壁時計由来のフィールドを載せないこと", () => {
    const { output } = runStartGameUseCase({
      gameSession: createGameSessionStub({ signedElapsedMs: -1_000 }),
    });

    const payload = output.publishGameStartToRoom.mock.calls[0]?.[1];
    expect(Object.keys(payload ?? {}).sort()).toEqual([
      "fieldSizePreset",
      "gridCols",
      "gridRows",
      "roomId",
      "serverElapsedMs",
    ]);
  });

  it("経過msが未確定の場合は開始待機時間の負値へ倒すこと", () => {
    const { output } = runStartGameUseCase();

    expect(output.publishGameStartToRoom).toHaveBeenCalledWith(
      "room-1",
      expect.objectContaining({ serverElapsedMs: -GAME_START_DELAY_MS }),
    );
  });

  it("経過msが0の場合はそのまま配信すること", () => {
    const { output } = runStartGameUseCase({
      gameSession: createGameSessionStub({ signedElapsedMs: 0 }),
    });

    expect(output.publishGameStartToRoom).toHaveBeenCalledWith(
      "room-1",
      expect.objectContaining({ serverElapsedMs: 0 }),
    );
  });

  it("セッション側フィールド設定がある場合はそれを配信すること", () => {
    const { output } = runStartGameUseCase({
      gameSession: createGameSessionStub({
        signedElapsedMs: -GAME_START_DELAY_MS,
        sessionFieldConfig: {
          fieldSizePreset: "LARGE",
          gridCols: 45,
          gridRows: 45,
        },
      }),
    });

    expect(output.publishGameStartToRoom).toHaveBeenCalledWith(
      "room-1",
      expect.objectContaining({
        fieldSizePreset: "LARGE",
        gridCols: 45,
        gridRows: 45,
      }),
    );
  });

  it("tickでハリケーン全量更新が空の場合は配信しないこと", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onTick(createTickData());

    expect(output.publishCurrentHurricanesToRoom).not.toHaveBeenCalled();
  });

  it("tickでハリケーン全量更新がある場合は配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();
    const hurricane = {
      id: "h1",
      x: 1,
      y: 2,
      radius: 1.1,
      rotationRad: 0,
    };

    callbacks.onTick(
      createTickData({
        hurricaneSync: {
          currentUpdates: [hurricane],
          updateUpdates: [],
          activeHurricaneIds: ["h1"],
        },
      }),
    );

    expect(output.publishCurrentHurricanesToRoom).toHaveBeenCalledWith(
      "room-1",
      [hurricane],
    );
  });

  it("tickでハリケーン差分更新が空でも生存IDごと配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onTick(createTickData());

    expect(output.publishUpdateHurricanesToRoom).toHaveBeenCalledWith(
      "room-1",
      [],
      [],
    );
  });

  it("tickで差分が空でも生存中のハリケーンIDを渡すこと", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onTick(
      createTickData({
        hurricaneSync: {
          currentUpdates: [],
          updateUpdates: [],
          activeHurricaneIds: ["h1", "h2"],
        },
      }),
    );

    expect(output.publishUpdateHurricanesToRoom).toHaveBeenCalledWith(
      "room-1",
      [],
      ["h1", "h2"],
    );
  });

  it("tickでハリケーン差分更新がある場合は配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();
    const hurricane = {
      id: "h1",
      x: 1,
      y: 2,
      radius: 1.1,
      rotationRad: 0,
    };

    callbacks.onTick(
      createTickData({
        hurricaneSync: {
          currentUpdates: [],
          updateUpdates: [hurricane],
          activeHurricaneIds: ["h1"],
        },
      }),
    );

    expect(output.publishUpdateHurricanesToRoom).toHaveBeenCalledWith(
      "room-1",
      [hurricane],
      ["h1"],
    );
  });

  it("tickでプレイヤー差分が空でも配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onTick(createTickData());

    expect(output.publishUpdatePlayersToRoom).toHaveBeenCalledWith("room-1", []);
  });

  it("tickでマップ差分が空の場合は配信しないこと", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onTick(createTickData());

    expect(output.publishMapCellUpdatesToRoom).not.toHaveBeenCalled();
  });

  it("tickでマップ差分がある場合は配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onTick(
      createTickData({ cellUpdates: [{ index: 3, teamId: 1 }] }),
    );

    expect(output.publishMapCellUpdatesToRoom).toHaveBeenCalledWith("room-1", [
      { index: 3, teamId: 1 },
    ]);
  });

  it("ゲーム終了時にゲーム終了通知をルームへ配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();
    const resultPayload: GameResultPayload = {
      rankings: [],
      finalGridColors: [],
    };

    callbacks.onGameEnd(resultPayload);

    expect(output.publishGameEndToRoom).toHaveBeenCalledWith("room-1");
  });

  it("ゲーム終了時に結果ペイロードをルームへ配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();
    const resultPayload: GameResultPayload = {
      rankings: [],
      finalGridColors: [1, 2],
    };

    callbacks.onGameEnd(resultPayload);

    expect(output.publishGameResultToRoom).toHaveBeenCalledWith(
      "room-1",
      resultPayload,
    );
  });

  it("ゲーム終了時に終了コールバックを実行すること", () => {
    const onGameEnd = vi.fn();
    const { callbacks } = runStartGameUseCase({ onGameEnd });

    callbacks.onGameEnd({ rankings: [], finalGridColors: [] });

    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it("Bot被弾時に対象を除いたルームへ被弾通知を配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onBotBombHit?.("bot:room-1:1", "bomb-1");

    expect(output.publishPlayerHitToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "bot:room-1:1",
      { playerId: "bot:room-1:1" },
    );
  });

  it("ハリケーン被弾時にルーム全体へ被弾通知を配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onHurricanePlayerHit?.("socket-1");

    expect(output.publishHurricaneHitToRoom).toHaveBeenCalledWith("room-1", {
      playerId: "socket-1",
    });
  });

  it("Bot爆弾設置時に爆弾確定通知を配信すること", () => {
    const { output, callbacks } = runStartGameUseCase();
    const payload: PlaceBombPayload = {
      requestId: "bot-req-1",
      x: 2,
      y: 3,
      explodeAtElapsedMs: 9_000,
    };

    callbacks.onBotPlaceBomb?.("bot:room-1:1", payload);

    expect(output.publishBombPlacedToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "bot:room-1:1",
      {
        bombId: "bomb-1",
        ownerTeamId: 1,
        x: 2,
        y: 3,
        explodeAtElapsedMs: SERVER_EXPLODE_AT_ELAPSED_MS,
      },
    );
  });

  it("Bot爆弾設置が重複排除された場合は配信しないこと", () => {
    const { output, callbacks } = runStartGameUseCase({
      bombStore: createBombStoreStub(false),
    });

    callbacks.onBotPlaceBomb?.("bot:room-1:1", {
      requestId: "bot-req-1",
      x: 2,
      y: 3,
      explodeAtElapsedMs: 9_000,
    });

    expect(output.publishBombPlacedToOthersInRoom).not.toHaveBeenCalled();
  });

  it("Bot爆弾設置でもACKを設置者へ返すこと", () => {
    const { output, callbacks } = runStartGameUseCase();

    callbacks.onBotPlaceBomb?.("bot:room-1:1", {
      requestId: "bot-req-1",
      x: 2,
      y: 3,
      explodeAtElapsedMs: 9_000,
    });

    expect(output.publishBombPlacedAckToSocket).toHaveBeenCalledWith(
      "bot:room-1:1",
      { requestId: "bot-req-1", bombId: "bomb-1" },
    );
  });
});
