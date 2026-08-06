/**
 * placeBombUseCase.test
 * 爆弾設置ユースケースの現行挙動を固定する characterization test
 * 重複排除の可否分岐と配信ペイロード内容を検証する
 */
import type { BombPlacedAckPayload, BombPlacedPayload } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { ActiveBombRegistration } from "../ports/gameUseCasePorts";
import { placeBombUseCase } from "./placeBombUseCase";

type BombStoreStubParams = {
  shouldBroadcast: boolean;
  bombId?: string;
  ownerTeamId?: number;
};

/** 重複排除結果と採番結果を固定した BombPlacementPort スタブを生成する */
const createBombStoreStub = ({
  shouldBroadcast,
  bombId = "bomb-1",
  ownerTeamId = 2,
}: BombStoreStubParams) => {
  return {
    shouldBroadcastBombPlaced: vi.fn<
      (dedupeKey: string, nowMs: number) => boolean
    >(() => shouldBroadcast),
    issueServerBombId: vi.fn<() => string>(() => bombId),
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

describe("placeBombUseCase", () => {
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
      "socket-1:req-1",
      1_000,
    );
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
