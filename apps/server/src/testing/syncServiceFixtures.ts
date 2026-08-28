/**
 * syncServiceFixtures
 * ユニットテスト専用のAOI同期サービス用スタブを提供する
 * 送信内容を記録するエミッタスタブと，ルーム参加者・ランタイムプレイヤーを固定した
 * 依存スタブを用意し，各同期サービス（player / bomb / hurricane）のテストから共有する
 * ※ テスト専用のため本番コードから import してはならない（ビルド対象外）
 */
import { type domain } from "@repo/shared";
import { vi } from "vitest";

import type { ActiveBombSnapshot } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import type { ReliableEmitters } from "@server/network/handlers/CommonHandler";
import type { RuntimeResolverDeps } from "@server/network/handlers/game/runtime/gameRuntimeResolvers";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import { createPlayerData } from "./playerFixtures";

/** エミッタスタブが記録する送信 1 件 */
export type EmitCall = {
  socketId: string;
  event: string;
  payload: unknown;
};

/** 送信内容を記録するエミッタスタブを生成する */
export const createReliableStub = () => {
  const calls: EmitCall[] = [];
  const noop = () => {};
  const reliable = {
    emitToAll: noop,
    emitToRoom: noop,
    emitToRoomExceptSocket: noop,
    emitToSocket: noop,
    emitToSocketById: (socketId: string, event: string, payload: unknown) => {
      calls.push({ socketId, event, payload });
    },
  } as unknown as ReliableEmitters;

  return { reliable, calls };
};

/** ルーム参加者とランタイムプレイヤーを固定した依存スタブを生成する */
export const createRuntimeDeps = (
  memberIds: string[],
  players: domain.game.player.PlayerData[],
  bombs: ActiveBombSnapshot[] = [],
): RuntimeResolverDeps => {
  const gameManager = {
    getRoomPlayers: () => players,
    getActiveBombSnapshots: () => bombs,
  } as unknown as RoomScopedGamePort;

  return {
    roomManager: {
      getRoomById: () => ({
        roomId: "room-1",
        ownerId: memberIds[0] ?? "socket-1",
        players: memberIds.map((id) => ({
          id,
          name: `name-${id}`,
          isOwner: false,
          isReady: false,
          preferredTeamId: null,
        })),
        status: "playing" as const,
        maxPlayers: 8,
        fieldSizePreset: "MEDIUM" as const,
        teamAssignmentMode: "random" as const,
      }),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: () => gameManager,
    },
  };
};

/** 同期サービスの生成に渡す共通スタブの上書き指定 */
export type SyncServiceEnvParams = {
  memberIds?: string[];
  players?: domain.game.player.PlayerData[];
  bombs?: ActiveBombSnapshot[];
};

/** 同期サービスの生成に必要な共通スタブ一式を生成する */
export const createSyncServiceEnv = (params: SyncServiceEnvParams = {}) => {
  const { reliable, calls } = createReliableStub();
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();
  const updateViewerAoiCellCache = vi.fn();
  const runtimeDeps = createRuntimeDeps(
    params.memberIds ?? ["socket-1"],
    params.players ?? [createPlayerData("socket-1")],
    params.bombs ?? [],
  );

  return {
    reliable,
    calls,
    realtimeRoomSyncState,
    updateViewerAoiCellCache,
    runtimeDeps,
  };
};
