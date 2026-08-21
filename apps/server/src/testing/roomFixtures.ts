/**
 * roomFixtures
 * ユニットテスト専用のルーム関連フィクスチャを提供する
 * 既定値＋部分上書きでルーム状態を組み立て，テスト間の重複定義を防ぐ
 * ※ テスト専用のため本番コードから import してはならない（ビルド対象外）
 */
import { domain } from "@repo/shared";

/** ルーム所属プレイヤーの既定値を部分上書きして生成する（名前は既定でIDから導出する） */
export const createRoomMember = (
  overrides: Partial<domain.room.RoomMember> = {},
): domain.room.RoomMember => {
  const id = overrides.id ?? "socket-1";

  return {
    id,
    name: `name-${id}`,
    isOwner: false,
    isReady: false,
    preferredTeamId: null,
    ...overrides,
  };
};

/** ルーム状態の既定値を部分上書きして生成する */
export const createRoom = (
  overrides: Partial<domain.room.Room> = {},
): domain.room.Room => {
  return {
    roomId: "room-1",
    ownerId: "socket-1",
    players: [],
    status: domain.room.RoomPhase.WAITING,
    maxPlayers: 4,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
    ...overrides,
  };
};
