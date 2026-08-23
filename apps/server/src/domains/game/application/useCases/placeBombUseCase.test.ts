/**
 * placeBombUseCase.test
 * 爆弾設置ユースケースの現行挙動を固定する characterization test
 * 重複排除の可否分岐と配信ペイロード内容を検証する
 */
import type { BombPlacedAckPayload, BombPlacedPayload } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@server/config";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import type {
  ActiveBombRegistration,
  GameFieldConfig,
} from "../ports/gameUseCasePorts";
import { GameRoomSession } from "../services/GameRoomSession";
import { placeBombUseCase } from "./placeBombUseCase";

type BombStoreStubParams = {
  shouldBroadcast: boolean;
  /** クールダウン未経過で受理できない状況を再現する場合はfalseを指定する */
  shouldAccept?: boolean;
  bombId?: string;
  /** セッション未開始で採番できない状況を再現する場合はfalseを指定する */
  canIssueBombId?: boolean;
  ownerTeamId?: number;
};

/** 重複排除結果と採番結果を固定した BombPlacementPort スタブを生成する */
const createBombStoreStub = ({
  shouldBroadcast,
  shouldAccept = true,
  bombId = "bomb-1",
  canIssueBombId = true,
  ownerTeamId = 2,
}: BombStoreStubParams) => {
  return {
    shouldBroadcastBombPlaced: vi.fn<
      (dedupeKey: string, nowMs: number) => boolean
    >(() => shouldBroadcast),
    shouldAcceptBombPlacement: vi.fn<
      (playerId: string, nowMs: number) => boolean
    >(() => shouldAccept),
    issueServerBombId: vi.fn<() => string | undefined>(() =>
      canIssueBombId ? bombId : undefined,
    ),
    registerActiveBomb: vi.fn<(registration: ActiveBombRegistration) => void>(),
    getPlayerTeamId: vi.fn<(playerId: string) => number>(() => ownerTeamId),
  };
};

/** 爆弾配信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
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
  };
};

const input = {
  socketId: "socket-1",
  payload: {
    requestId: "req-1",
    x: 3.5,
    y: 4.5,
    explodeAtElapsedMs: 12_000,
  },
  nowMs: 1_000,
};

let logSpy: ReturnType<typeof vi.spyOn>;

describe("placeBombUseCase", () => {
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("重複排除で配信不可の場合は爆弾IDを採番しないこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: false });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.issueServerBombId).not.toHaveBeenCalled();
  });

  it("重複排除で配信不可の場合は爆弾を登録しないこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: false });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.registerActiveBomb).not.toHaveBeenCalled();
  });

  it("重複排除で配信不可の場合は他プレイヤーへ配信しないこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: false });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedToOthersInRoom).not.toHaveBeenCalled();
  });

  it("重複排除で配信不可の場合はACKを返さないこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: false });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedAckToSocket).not.toHaveBeenCalled();
  });

  it("重複排除キーをソケットIDとリクエストIDから生成すること", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: true });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.shouldBroadcastBombPlaced).toHaveBeenCalledWith(
      "8:socket-1|5:req-1",
      1_000,
    );
  });

  it("クールダウン判定をプレイヤーIDと現在時刻で行うこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: true });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.shouldAcceptBombPlacement).toHaveBeenCalledWith(
      "socket-1",
      1_000,
    );
  });

  it("重複排除で配信不可の場合はクールダウン判定を行わないこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: false });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.shouldAcceptBombPlacement).not.toHaveBeenCalled();
  });

  it("クールダウン未経過の場合は爆弾IDを採番しないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      shouldAccept: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.issueServerBombId).not.toHaveBeenCalled();
  });

  it("クールダウン未経過の場合は爆弾を登録しないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      shouldAccept: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.registerActiveBomb).not.toHaveBeenCalled();
  });

  it("クールダウン未経過の場合は他プレイヤーへ配信しないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      shouldAccept: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedToOthersInRoom).not.toHaveBeenCalled();
  });

  it("クールダウン未経過の場合はACKを返さないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      shouldAccept: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedAckToSocket).not.toHaveBeenCalled();
  });

  it("クールダウン未経過の場合はクールダウン拒否として記録すること", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      shouldAccept: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.PLACE_BOMB,
      result: logResults.REJECTED_COOLDOWN,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("同一プレイヤーがリクエストIDを変えてクールダウン未経過に連投しても2件目は配信しないこと", () => {
    // 実セッションを爆弾ストアとして用い，重複排除をすり抜ける連投を再現する
    const fieldConfig: GameFieldConfig = {
      fieldSizePreset: "SMALL",
      gridCols: 6,
      gridRows: 6,
    };
    const session = new GameRoomSession(
      "room-1",
      ["socket-1", "socket-2"],
      {},
      fieldConfig,
    );
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore: session, input, output });
    placeBombUseCase({
      roomId: "room-1",
      bombStore: session,
      input: {
        ...input,
        payload: { ...input.payload, requestId: "req-2" },
        nowMs: 1_100,
      },
      output,
    });

    expect(output.publishBombPlacedToOthersInRoom).toHaveBeenCalledTimes(1);
  });

  it("配信可の場合は採番IDと設置座標で爆弾を登録すること", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: true });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.registerActiveBomb).toHaveBeenCalledWith({
      bombId: "bomb-1",
      ownerPlayerId: "socket-1",
      x: 3.5,
      y: 4.5,
      explodeAtElapsedMs: 12_000,
    });
  });

  it("配信可の場合は設置者を除いたルームへ確定通知を配信すること", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: true });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      {
        bombId: "bomb-1",
        ownerTeamId: 2,
        x: 3.5,
        y: 4.5,
        explodeAtElapsedMs: 12_000,
      },
    );
  });

  it("配信可の場合は設置者へリクエストID付きACKを返すこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: true });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedAckToSocket).toHaveBeenCalledWith(
      "socket-1",
      { requestId: "req-1", bombId: "bomb-1" },
    );
  });

  it("爆弾IDを採番できない場合は爆弾を登録しないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      canIssueBombId: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.registerActiveBomb).not.toHaveBeenCalled();
  });

  it("爆弾IDを採番できない場合は他プレイヤーへ配信しないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      canIssueBombId: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedToOthersInRoom).not.toHaveBeenCalled();
  });

  it("爆弾IDを採番できない場合はACKを返さないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      canIssueBombId: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedAckToSocket).not.toHaveBeenCalled();
  });

  it("爆弾IDを採番できない場合はチームIDを解決しないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      canIssueBombId: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(bombStore.getPlayerTeamId).not.toHaveBeenCalled();
  });

  it("爆弾IDを採番できない場合はセッション未開始として記録すること", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      canIssueBombId: false,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.PLACE_BOMB,
      result: logResults.IGNORED_SESSION_NOT_STARTED,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("爆弾IDを採番できない場合は例外を投げないこと", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      canIssueBombId: false,
    });
    const output = createOutputStub();

    expect(() =>
      placeBombUseCase({ roomId: "room-1", bombStore, input, output }),
    ).not.toThrow();
  });

  it("採番できた場合はセッション未開始のログを記録しないこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: true });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("重複排除で配信不可の場合はセッション未開始のログを記録しないこと", () => {
    const bombStore = createBombStoreStub({ shouldBroadcast: false });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("クライアントが送った即時起爆の爆発予定時刻を配信しないこと", () => {
    // 開始時刻を0に固定し，nowMs をそのままサーバー経過時間として扱う
    vi.spyOn(Date, "now").mockReturnValue(
      -config.GAME_CONFIG.GAME_START_DELAY_MS,
    );
    const fieldConfig: GameFieldConfig = {
      fieldSizePreset: "SMALL",
      gridCols: 6,
      gridRows: 6,
    };
    const session = new GameRoomSession("room-1", ["socket-1"], {}, fieldConfig);
    session.start(50, { onTick: vi.fn(), onGameEnd: vi.fn() });
    const output = createOutputStub();

    placeBombUseCase({
      roomId: "room-1",
      bombStore: session,
      input: {
        ...input,
        payload: { ...input.payload, explodeAtElapsedMs: 0 },
        nowMs: 5_000,
      },
      output,
    });

    expect(output.publishBombPlacedToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      expect.objectContaining({
        explodeAtElapsedMs: 5_000 + config.GAME_CONFIG.BOMB_FUSE_MS,
      }),
    );
    session.dispose();
  });

  it("クライアントが送った即時起爆の爆発予定時刻を爆弾登録に使わないこと", () => {
    vi.spyOn(Date, "now").mockReturnValue(
      -config.GAME_CONFIG.GAME_START_DELAY_MS,
    );
    const fieldConfig: GameFieldConfig = {
      fieldSizePreset: "SMALL",
      gridCols: 6,
      gridRows: 6,
    };
    const session = new GameRoomSession("room-1", ["socket-1"], {}, fieldConfig);
    session.start(50, { onTick: vi.fn(), onGameEnd: vi.fn() });
    const output = createOutputStub();

    placeBombUseCase({
      roomId: "room-1",
      bombStore: session,
      input: {
        ...input,
        payload: { ...input.payload, explodeAtElapsedMs: 0 },
        nowMs: 5_000,
      },
      output,
    });

    expect(session.getActiveBombSnapshots()[0]?.explodeAtElapsedMs).toBe(
      5_000 + config.GAME_CONFIG.BOMB_FUSE_MS,
    );
    session.dispose();
  });

  it("チームID未解決の場合はownerTeamIdに-1を配信すること", () => {
    const bombStore = createBombStoreStub({
      shouldBroadcast: true,
      ownerTeamId: -1,
    });
    const output = createOutputStub();

    placeBombUseCase({ roomId: "room-1", bombStore, input, output });

    expect(output.publishBombPlacedToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      expect.objectContaining({ ownerTeamId: -1 }),
    );
  });
});
