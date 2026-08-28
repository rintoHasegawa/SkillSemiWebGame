/**
 * gamePortFixtures
 * ユニットテスト専用のゲーム管理ポートスタブを提供する
 * ルーム単位ゲーム管理ポート（RoomScopedGamePort）の全メソッドを既定値付きで用意し，
 * 検証対象のメソッドだけを上書きできるようにする
 * ※ テスト専用のため本番コードから import してはならない（ビルド対象外）
 */
import { vi, type Mock } from "vitest";

import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";

/** ルーム単位ゲーム管理ポートの全メソッドをモック化したスタブ型 */
export type RoomScopedGamePortStub = {
  [K in keyof RoomScopedGamePort]: Mock<RoomScopedGamePort[K]>;
};

/** ルーム単位ゲーム管理ポートを満たすスタブを生成する（既定値は部分上書きできる） */
export const createRoomScopedGamePortStub = (
  overrides: Partial<RoomScopedGamePortStub> = {},
): RoomScopedGamePortStub => {
  const base: RoomScopedGamePortStub = {
    startRoomSession: vi.fn<RoomScopedGamePort["startRoomSession"]>(),
    getRoomSignedElapsedMs: vi.fn<
      RoomScopedGamePort["getRoomSignedElapsedMs"]
    >(() => undefined),
    getRoomFieldConfig: vi.fn<RoomScopedGamePort["getRoomFieldConfig"]>(
      () => undefined,
    ),
    getRoomPlayers: vi.fn<RoomScopedGamePort["getRoomPlayers"]>(() => []),
    getMapGridColorsView: vi.fn<RoomScopedGamePort["getMapGridColorsView"]>(
      () => [],
    ),
    movePlayer: vi.fn<RoomScopedGamePort["movePlayer"]>(),
    shouldBroadcastBombPlaced: vi.fn<
      RoomScopedGamePort["shouldBroadcastBombPlaced"]
    >(() => true),
    shouldAcceptBombPlacement: vi.fn<
      RoomScopedGamePort["shouldAcceptBombPlacement"]
    >(() => true),
    issueServerBombId: vi.fn<RoomScopedGamePort["issueServerBombId"]>(
      () => "bomb-1",
    ),
    resolveBombExplodeAtElapsedMs: vi.fn<
      RoomScopedGamePort["resolveBombExplodeAtElapsedMs"]
    >(() => 1_000),
    registerActiveBomb: vi.fn<RoomScopedGamePort["registerActiveBomb"]>(),
    getPlayerTeamId: vi.fn<RoomScopedGamePort["getPlayerTeamId"]>(() => 0),
    getActiveBombSnapshots: vi.fn<
      RoomScopedGamePort["getActiveBombSnapshots"]
    >(() => []),
    shouldBroadcastBombHitReport: vi.fn<
      RoomScopedGamePort["shouldBroadcastBombHitReport"]
    >(() => true),
    isSameTeamBombHitReport: vi.fn<
      RoomScopedGamePort["isSameTeamBombHitReport"]
    >(() => false),
    checkBombHitReportOrigin: vi.fn<
      RoomScopedGamePort["checkBombHitReportOrigin"]
    >(() => ({ status: "valid" })),
    recordBombHitForOwner: vi.fn<RoomScopedGamePort["recordBombHitForOwner"]>(),
    removePlayer: vi.fn<RoomScopedGamePort["removePlayer"]>(),
    replaceDisconnectedPlayerWithBot: vi.fn<
      RoomScopedGamePort["replaceDisconnectedPlayerWithBot"]
    >(() => false),
    demotePlayerFromBotControl: vi.fn<
      RoomScopedGamePort["demotePlayerFromBotControl"]
    >(() => true),
  };

  return { ...base, ...overrides };
};
