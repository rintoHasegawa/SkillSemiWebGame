/**
 * SessionReservationRegistry.test
 * 復帰用セッション予約レジストリの仕様を検証する
 * 予約の1回限り消費・ルーム単位の選択削除・トークン単位の破棄を対象とする
 */
import { describe, expect, it } from "vitest";

import {
  SessionReservationRegistry,
  type SessionReservationEntry,
} from "./SessionReservationRegistry";

type EntryParams = Partial<SessionReservationEntry>;

/** 予約エントリの既定値を部分上書きして生成する */
const createEntry = (overrides: EntryParams = {}): SessionReservationEntry => {
  return {
    playerId: "player-1",
    roomId: "room-1",
    playerName: "太郎",
    teamId: 0,
    ...overrides,
  };
};

describe("SessionReservationRegistry", () => {
  describe("consume", () => {
    it("予約が無いトークンでは undefined を返すこと", () => {
      const registry = new SessionReservationRegistry();

      expect(registry.consume("token-1")).toBeUndefined();
    });

    it("予約済みトークンでは登録した在籍情報を返すこと", () => {
      const registry = new SessionReservationRegistry();
      const entry = createEntry();
      registry.reserve("token-1", entry);

      expect(registry.consume("token-1")).toEqual(entry);
    });

    it("一度取り出した予約は二度目に undefined を返すこと", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry());
      registry.consume("token-1");

      expect(registry.consume("token-1")).toBeUndefined();
    });

    it("別トークンの予約は取り出しの影響を受けないこと", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry({ playerId: "player-1" }));
      registry.reserve("token-2", createEntry({ playerId: "player-2" }));

      registry.consume("token-1");

      expect(registry.consume("token-2")?.playerId).toBe("player-2");
    });
  });

  describe("reserve", () => {
    it("同じトークンへ再登録すると後の予約で上書きすること", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry({ roomId: "room-1" }));

      registry.reserve("token-1", createEntry({ roomId: "room-2" }));

      expect(registry.consume("token-1")?.roomId).toBe("room-2");
    });

    it("消費後に同じトークンで再予約できること", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry());
      registry.consume("token-1");

      registry.reserve("token-1", createEntry({ playerId: "player-9" }));

      expect(registry.consume("token-1")?.playerId).toBe("player-9");
    });
  });

  describe("releaseByRoomId", () => {
    it("指定ルームの予約を破棄すること", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry({ roomId: "room-1" }));

      registry.releaseByRoomId("room-1");

      expect(registry.consume("token-1")).toBeUndefined();
    });

    it("別ルームの予約は残すこと", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry({ roomId: "room-1" }));
      registry.reserve("token-2", createEntry({ roomId: "room-2" }));

      registry.releaseByRoomId("room-1");

      expect(registry.consume("token-2")?.roomId).toBe("room-2");
    });

    it("同一ルームの予約が複数あればすべて破棄すること", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry({ roomId: "room-1" }));
      registry.reserve("token-2", createEntry({ roomId: "room-1" }));
      registry.reserve("token-3", createEntry({ roomId: "room-1" }));

      registry.releaseByRoomId("room-1");

      expect([
        registry.consume("token-1"),
        registry.consume("token-2"),
        registry.consume("token-3"),
      ]).toEqual([undefined, undefined, undefined]);
    });

    it("予約が無いルームIDを指定しても例外を投げないこと", () => {
      const registry = new SessionReservationRegistry();

      expect(() => registry.releaseByRoomId("room-unknown")).not.toThrow();
    });
  });

  describe("releaseByToken", () => {
    it("指定トークンの予約を破棄すること", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry());

      registry.releaseByToken("token-1");

      expect(registry.consume("token-1")).toBeUndefined();
    });

    it("別トークンの予約は残すこと", () => {
      const registry = new SessionReservationRegistry();
      registry.reserve("token-1", createEntry());
      registry.reserve("token-2", createEntry({ playerId: "player-2" }));

      registry.releaseByToken("token-1");

      expect(registry.consume("token-2")?.playerId).toBe("player-2");
    });

    it("未予約のトークンを破棄しても例外を投げないこと", () => {
      const registry = new SessionReservationRegistry();

      expect(() => registry.releaseByToken("token-unknown")).not.toThrow();
    });
  });
});
