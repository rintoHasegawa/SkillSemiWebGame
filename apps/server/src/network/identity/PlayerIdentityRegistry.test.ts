/**
 * PlayerIdentityRegistry.test
 * ソケットIDとプレイヤーIDの対応レジストリの仕様を検証する
 * 未登録ソケットのフォールバック・別ソケットへの載せ替え・解放後の逆引き整合を対象とする
 */
import { describe, expect, it } from "vitest";

import { PlayerIdentityRegistry } from "./PlayerIdentityRegistry";

describe("PlayerIdentityRegistry", () => {
  describe("resolvePlayerId", () => {
    it("未登録のソケットIDはそのままプレイヤーIDとして返すこと", () => {
      const registry = new PlayerIdentityRegistry();

      expect(registry.resolvePlayerId("socket-1")).toBe("socket-1");
    });

    it("結び付け済みのソケットには対応するプレイヤーIDを返すこと", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-2", "player-1");

      expect(registry.resolvePlayerId("socket-2")).toBe("player-1");
    });

    it("空文字のソケットIDでも例外を投げず同じ値を返すこと", () => {
      const registry = new PlayerIdentityRegistry();

      expect(registry.resolvePlayerId("")).toBe("");
    });
  });

  describe("getSocketId", () => {
    it("未登録のプレイヤーIDには undefined を返すこと", () => {
      const registry = new PlayerIdentityRegistry();

      expect(registry.getSocketId("player-1")).toBeUndefined();
    });

    it("結び付け済みのプレイヤーIDには現在のソケットIDを返すこと", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-2", "player-1");

      expect(registry.getSocketId("player-1")).toBe("socket-2");
    });
  });

  describe("bind", () => {
    it("同じプレイヤーを新しいソケットへ載せ替えると逆引きが新しいソケットを指すこと", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");

      registry.bind("socket-2", "player-1");

      expect(registry.getSocketId("player-1")).toBe("socket-2");
    });

    it("載せ替え後は古いソケットの解決がフォールバックへ戻ること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");

      registry.bind("socket-2", "player-1");

      expect(registry.resolvePlayerId("socket-1")).toBe("socket-1");
    });

    it("同じソケットへ別のプレイヤーIDを結び付けると新しい対応で解決すること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");

      registry.bind("socket-1", "player-2");

      expect(registry.resolvePlayerId("socket-1")).toBe("player-2");
    });

    it("同じソケットへ別のプレイヤーIDを結び付けると古いプレイヤーIDの逆引きが消えること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");

      registry.bind("socket-1", "player-2");

      expect(registry.getSocketId("player-1")).toBeUndefined();
    });

    it("同じ組み合わせを再度結び付けても対応が保たれること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");

      registry.bind("socket-1", "player-1");

      expect({
        playerId: registry.resolvePlayerId("socket-1"),
        socketId: registry.getSocketId("player-1"),
      }).toEqual({ playerId: "player-1", socketId: "socket-1" });
    });

    it("ソケットIDと同じ値のプレイヤーIDを結び付けても解決できること", () => {
      const registry = new PlayerIdentityRegistry();

      registry.bind("socket-1", "socket-1");

      expect(registry.getSocketId("socket-1")).toBe("socket-1");
    });
  });

  describe("release", () => {
    it("解放したソケットの解決がフォールバックへ戻ること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");

      registry.release("socket-1");

      expect(registry.resolvePlayerId("socket-1")).toBe("socket-1");
    });

    it("解放したプレイヤーIDの逆引きが消えること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");

      registry.release("socket-1");

      expect(registry.getSocketId("player-1")).toBeUndefined();
    });

    it("載せ替え済みの古いソケットを解放しても新しい対応を壊さないこと", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");
      registry.bind("socket-2", "player-1");

      registry.release("socket-1");

      expect(registry.getSocketId("player-1")).toBe("socket-2");
    });

    it("載せ替え済みの古いソケットを解放しても新しいソケットの解決が保たれること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");
      registry.bind("socket-2", "player-1");

      registry.release("socket-1");

      expect(registry.resolvePlayerId("socket-2")).toBe("player-1");
    });

    it("未登録のソケットを解放しても例外を投げないこと", () => {
      const registry = new PlayerIdentityRegistry();

      expect(() => registry.release("socket-unknown")).not.toThrow();
    });

    it("同じソケットを二度解放しても例外を投げないこと", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");
      registry.release("socket-1");

      expect(() => registry.release("socket-1")).not.toThrow();
    });

    it("解放後に同じソケットへ再度結び付けられること", () => {
      const registry = new PlayerIdentityRegistry();
      registry.bind("socket-1", "player-1");
      registry.release("socket-1");

      registry.bind("socket-1", "player-2");

      expect(registry.resolvePlayerId("socket-1")).toBe("player-2");
    });
  });
});
