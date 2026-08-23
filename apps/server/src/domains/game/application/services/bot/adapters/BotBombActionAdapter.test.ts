/**
 * BotBombActionAdapter.test
 * Bot爆弾アクション橋渡しの現行挙動を固定する characterization test
 * ユースケースへの入力生成と重複排除時の非配信を検証する
 */
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  GameResultPayload,
  GameStartPayload,
  HurricaneHitPayload,
  PlayerHitPayload,
  domain,
} from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveBombRegistration } from "../../../ports/gameUseCasePorts";
import { createBotBombActionHandler } from "./BotBombActionAdapter";

const FIXED_NOW_MS = 1_700_000_000_000;
// サーバー経過時間から解決される爆発予定時刻（申告値と区別するため別値にする）
const SERVER_EXPLODE_AT_ELAPSED_MS = 11_000;

/** 爆弾配信可否を固定した BombPlacementPort スタブを生成する */
const createBombStoreStub = (shouldBroadcast: boolean) => {
  return {
    shouldBroadcastBombPlaced: vi.fn<
      (dedupeKey: string, nowMs: number) => boolean
    >(() => shouldBroadcast),
    shouldAcceptBombPlacement: vi.fn<
      (playerId: string, nowMs: number) => boolean
    >(() => true),
    issueServerBombId: vi.fn<() => string>(() => "bomb-1"),
    resolveBombExplodeAtElapsedMs: vi.fn<(nowMs: number) => number>(
      () => SERVER_EXPLODE_AT_ELAPSED_MS,
    ),
    registerActiveBomb: vi.fn<(registration: ActiveBombRegistration) => void>(),
    getPlayerTeamId: vi.fn<(playerId: string) => number>(() => 1),
  };
};

/** 配信呼び出しを記録する出力ポートスタブを生成する */
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
      (roomId: string, hurricanes: unknown[]) => void
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

const payload = {
  requestId: "bot-req-1",
  x: 2,
  y: 3,
  explodeAtElapsedMs: 9_000,
};

describe("createBotBombActionHandler", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("現在時刻を重複排除判定へ渡すこと", () => {
    const bombStore = createBombStoreStub(true);
    const handler = createBotBombActionHandler({
      roomId: "room-1",
      bombStore,
      output: createOutputStub(),
    });

    handler("bot:room-1:1", payload);

    expect(bombStore.shouldBroadcastBombPlaced).toHaveBeenCalledWith(
      "12:bot:room-1:1|9:bot-req-1",
      FIXED_NOW_MS,
    );
  });

  it("配信可の場合は設置者を除いたルームへ配信すること", () => {
    const output = createOutputStub();
    const handler = createBotBombActionHandler({
      roomId: "room-1",
      bombStore: createBombStoreStub(true),
      output,
    });

    handler("bot:room-1:1", payload);

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

  it("配信可の場合はBotにもACKを返すこと", () => {
    const output = createOutputStub();
    const handler = createBotBombActionHandler({
      roomId: "room-1",
      bombStore: createBombStoreStub(true),
      output,
    });

    handler("bot:room-1:1", payload);

    expect(output.publishBombPlacedAckToSocket).toHaveBeenCalledWith(
      "bot:room-1:1",
      { requestId: "bot-req-1", bombId: "bomb-1" },
    );
  });

  it("重複排除された場合は配信しないこと", () => {
    const output = createOutputStub();
    const handler = createBotBombActionHandler({
      roomId: "room-1",
      bombStore: createBombStoreStub(false),
      output,
    });

    handler("bot:room-1:1", payload);

    expect(output.publishBombPlacedToOthersInRoom).not.toHaveBeenCalled();
  });

  it("重複排除された場合は爆弾を登録しないこと", () => {
    const bombStore = createBombStoreStub(false);
    const handler = createBotBombActionHandler({
      roomId: "room-1",
      bombStore,
      output: createOutputStub(),
    });

    handler("bot:room-1:1", payload);

    expect(bombStore.registerActiveBomb).not.toHaveBeenCalled();
  });
});
