/**
 * resumeSessionCoordinator.test
 * RESUME_SESSION調停の仕様を検証するテスト
 * status ユニオン（resumed / expired / game_ended）の全分岐と，
 * 拒否時に配信チャンネル・識別子の張り替えを残さないことを対象とする
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RestorePlayerParams,
  RestorePlayerResult,
  RoomScopedGamePort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  PlayerIdentityRegistry,
  SessionReservationRegistry,
  type SessionReservationEntry,
} from "@server/network/identity";
import {
  logResults,
  logScopes,
  roomUseCaseLogEvents,
} from "@server/logging/index";
import { createRoomScopedGamePortStub } from "@server/testing/gamePortFixtures";
import { createRoom, createRoomMember } from "@server/testing/roomFixtures";
import { resumeSessionCoordinator } from "./resumeSessionCoordinator";

/** 復帰対象の在籍情報（予約に載る値） */
const reservationEntry: SessionReservationEntry = {
  playerId: "player-1",
  roomId: "room-1",
  playerName: "太郎",
  teamId: 1,
};

type DepsParams = {
  /** 予約に登録するトークン（未指定なら予約しない） */
  reservedToken?: string;
  gameManager?: RoomScopedGamePort;
  /** ゲームランタイムを解決できない状況を再現するか */
  missingGameManager?: boolean;
  restoreResult?: RestorePlayerResult;
};

/** 復帰調停の依存集合を生成する（レジストリは実装をそのまま使う） */
const createDeps = ({
  reservedToken,
  gameManager = createRoomScopedGamePortStub(),
  missingGameManager = false,
  restoreResult = {
    status: "restored",
    room: createRoom({
      players: [createRoomMember({ id: "player-1", name: "太郎" })],
    }),
  },
}: DepsParams = {}) => {
  const sessionReservations = new SessionReservationRegistry();
  if (reservedToken) {
    sessionReservations.reserve(reservedToken, reservationEntry);
  }

  return {
    socketId: "socket-2",
    roomManager: {
      restorePlayerToRoom: vi.fn<
        (params: RestorePlayerParams) => RestorePlayerResult
      >(() => restoreResult),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: vi.fn<
        (roomId: string) => RoomScopedGamePort | undefined
      >(() => (missingGameManager ? undefined : gameManager)),
    },
    sessionReservations,
    identityRegistry: new PlayerIdentityRegistry(),
    joinRoomChannel: vi.fn<(roomId: string) => Promise<void>>(() =>
      Promise.resolve(),
    ),
    gameManager,
  };
};

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resumeSessionCoordinator", () => {
  describe("resumed", () => {
    it("予約があれば status に resumed を返すこと", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-1",
      });

      expect(result.status).toBe("resumed");
    });

    it("復帰時は切断前のプレイヤーIDを返すこと", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-1",
      });

      expect(result).toEqual(
        expect.objectContaining({ playerId: "player-1" }),
      );
    });

    it("復帰時は復席後のルームを返すこと", async () => {
      const room = createRoom({
        roomId: "room-1",
        players: [createRoomMember({ id: "player-1" })],
      });
      const deps = createDeps({
        reservedToken: "token-1",
        restoreResult: { status: "restored", room },
      });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-1",
      });

      expect(result).toEqual(expect.objectContaining({ room }));
    });

    it("復帰時はBot制御を解除すること", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.gameManager.demotePlayerFromBotControl).toHaveBeenCalledWith(
        "player-1",
      );
    });

    it("復帰時はBot制御へ戻さないこと", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(
        deps.gameManager.replaceDisconnectedPlayerWithBot,
      ).not.toHaveBeenCalled();
    });

    it("復帰時は予約の在籍情報でルームへ復席させること", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.roomManager.restorePlayerToRoom).toHaveBeenCalledWith({
        roomId: "room-1",
        playerId: "player-1",
        playerName: "太郎",
        teamId: 1,
      });
    });

    it("復帰時はルーム配信チャンネルへ再参加させること", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.joinRoomChannel).toHaveBeenCalledWith("room-1");
    });

    it("復帰時は新しいソケットへ切断前のプレイヤーIDを結び付けること", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.identityRegistry.resolvePlayerId("socket-2")).toBe(
        "player-1",
      );
    });

    it("復帰時はプレイヤーID宛の送信先が新しいソケットになること", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.identityRegistry.getSocketId("player-1")).toBe("socket-2");
    });

    it("復帰時は resumed を記録すること", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(logSpy).toHaveBeenCalledWith(`[${logScopes.ROOM_USE_CASE}]`, {
        event: roomUseCaseLogEvents.RESUME_SESSION,
        result: logResults.RESUMED,
        socketId: "socket-2",
        roomId: "room-1",
        playerId: "player-1",
      });
    });

    it("同じトークンでの2回目の復帰要求は expired になること", async () => {
      const deps = createDeps({ reservedToken: "token-1" });
      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-1",
      });

      expect(result.status).toBe("expired");
    });
  });

  describe("expired", () => {
    it("トークン未提示では status に expired を返すこと", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: undefined,
      });

      expect(result.status).toBe("expired");
    });

    it("トークン未提示では予約を消費しないこと", async () => {
      const deps = createDeps({ reservedToken: "token-1" });

      await resumeSessionCoordinator({ ...deps, sessionToken: undefined });

      expect(deps.sessionReservations.consume("token-1")).toEqual(
        reservationEntry,
      );
    });

    it("予約が無いトークンでは status に expired を返すこと", async () => {
      const deps = createDeps();

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-unknown",
      });

      expect(result.status).toBe("expired");
    });

    it("予約が無い場合はルーム復席を試みないこと", async () => {
      const deps = createDeps();

      await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-unknown",
      });

      expect(deps.roomManager.restorePlayerToRoom).not.toHaveBeenCalled();
    });

    it("予約が無い場合は配信チャンネルへ参加させないこと", async () => {
      const deps = createDeps();

      await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-unknown",
      });

      expect(deps.joinRoomChannel).not.toHaveBeenCalled();
    });

    it("予約が無い場合はプレイヤーIDを結び付けないこと", async () => {
      const deps = createDeps();

      await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-unknown",
      });

      expect(deps.identityRegistry.resolvePlayerId("socket-2")).toBe(
        "socket-2",
      );
    });

    it("予約が無い場合は rejected_session_expired を記録すること", async () => {
      const deps = createDeps();

      await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-unknown",
      });

      expect(logSpy).toHaveBeenCalledWith(`[${logScopes.ROOM_USE_CASE}]`, {
        event: roomUseCaseLogEvents.RESUME_SESSION,
        result: logResults.REJECTED_SESSION_EXPIRED,
        socketId: "socket-2",
      });
    });
  });

  describe("game_ended", () => {
    it("ゲームランタイムを解決できない場合は status に game_ended を返すこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        missingGameManager: true,
      });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-1",
      });

      expect(result.status).toBe("game_ended");
    });

    it("ゲームランタイムを解決できない場合はルーム復席を試みないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        missingGameManager: true,
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.roomManager.restorePlayerToRoom).not.toHaveBeenCalled();
    });

    it("ゲームランタイムを解決できない場合は配信チャンネルへ参加させないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        missingGameManager: true,
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.joinRoomChannel).not.toHaveBeenCalled();
    });

    it("ゲームランタイムを解決できない場合はプレイヤーIDを結び付けないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        missingGameManager: true,
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.identityRegistry.resolvePlayerId("socket-2")).toBe(
        "socket-2",
      );
    });

    it("ゲームランタイムを解決できない場合でも予約は破棄すること", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        missingGameManager: true,
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.sessionReservations.consume("token-1")).toBeUndefined();
    });

    it("ゲームランタイムを解決できない場合は rejected_game_ended を記録すること", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        missingGameManager: true,
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(logSpy).toHaveBeenCalledWith(`[${logScopes.ROOM_USE_CASE}]`, {
        event: roomUseCaseLogEvents.RESUME_SESSION,
        result: logResults.REJECTED_GAME_ENDED,
        socketId: "socket-2",
        roomId: "room-1",
        playerId: "player-1",
      });
    });

    it("セッションから外れたプレイヤーは status に game_ended を返すこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        gameManager: createRoomScopedGamePortStub({
          demotePlayerFromBotControl: vi.fn(() => false),
        }),
      });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-1",
      });

      expect(result.status).toBe("game_ended");
    });

    it("セッションから外れたプレイヤーはルームへ復席させないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        gameManager: createRoomScopedGamePortStub({
          demotePlayerFromBotControl: vi.fn(() => false),
        }),
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.roomManager.restorePlayerToRoom).not.toHaveBeenCalled();
    });

    it("セッションから外れたプレイヤーは配信チャンネルへ参加させないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        gameManager: createRoomScopedGamePortStub({
          demotePlayerFromBotControl: vi.fn(() => false),
        }),
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.joinRoomChannel).not.toHaveBeenCalled();
    });

    it("セッションから外れたプレイヤーにはプレイヤーIDを結び付けないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        gameManager: createRoomScopedGamePortStub({
          demotePlayerFromBotControl: vi.fn(() => false),
        }),
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.identityRegistry.resolvePlayerId("socket-2")).toBe(
        "socket-2",
      );
    });

    it("ルームが消滅している場合は status に game_ended を返すこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        restoreResult: { status: "not_found" },
      });

      const result = await resumeSessionCoordinator({
        ...deps,
        sessionToken: "token-1",
      });

      expect(result.status).toBe("game_ended");
    });

    it("ルームが消滅している場合は配信チャンネルへ参加させないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        restoreResult: { status: "not_found" },
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.joinRoomChannel).not.toHaveBeenCalled();
    });

    it("ルームが消滅している場合はプレイヤーIDを結び付けないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        restoreResult: { status: "not_found" },
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(deps.identityRegistry.resolvePlayerId("socket-2")).toBe(
        "socket-2",
      );
    });

    it("ルームが消滅している場合は rejected_game_ended を記録すること", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        restoreResult: { status: "not_found" },
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(logSpy).toHaveBeenCalledWith(`[${logScopes.ROOM_USE_CASE}]`, {
        event: roomUseCaseLogEvents.RESUME_SESSION,
        result: logResults.REJECTED_GAME_ENDED,
        socketId: "socket-2",
        roomId: "room-1",
        playerId: "player-1",
      });
    });

    it("ルームが消滅している場合はBot制御へ戻すこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        restoreResult: { status: "not_found" },
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(
        deps.gameManager.replaceDisconnectedPlayerWithBot,
      ).toHaveBeenCalledWith("player-1");
    });

    it("セッションから外れたプレイヤーはBot制御へ戻さないこと", async () => {
      const deps = createDeps({
        reservedToken: "token-1",
        gameManager: createRoomScopedGamePortStub({
          demotePlayerFromBotControl: vi.fn(() => false),
        }),
      });

      await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

      expect(
        deps.gameManager.replaceDisconnectedPlayerWithBot,
      ).not.toHaveBeenCalled();
    });
  });

  it("復帰要求は予約のルームIDでゲームランタイムを解決すること", async () => {
    const deps = createDeps({ reservedToken: "token-1" });

    await resumeSessionCoordinator({ ...deps, sessionToken: "token-1" });

    expect(deps.runtimeRegistry.getGameManagerByRoomId).toHaveBeenCalledWith(
      "room-1",
    );
  });

  it("expired の拒否結果は status のみを返すこと", async () => {
    const deps = createDeps();

    const result = await resumeSessionCoordinator({
      ...deps,
      sessionToken: "token-unknown",
    });

    expect(result).toEqual({ status: "expired" });
  });

  it("game_ended の拒否結果は status のみを返すこと", async () => {
    const deps = createDeps({
      reservedToken: "token-1",
      missingGameManager: true,
    });

    const result = await resumeSessionCoordinator({
      ...deps,
      sessionToken: "token-1",
    });

    expect(result).toEqual({ status: "game_ended" });
  });

  it("進行中ルームでも復席できること", async () => {
    const room = createRoom({
      status: domain.room.RoomPhase.PLAYING,
      players: [createRoomMember({ id: "player-1" })],
    });
    const deps = createDeps({
      reservedToken: "token-1",
      restoreResult: { status: "restored", room },
    });

    const result = await resumeSessionCoordinator({
      ...deps,
      sessionToken: "token-1",
    });

    expect(result.status).toBe("resumed");
  });
});
