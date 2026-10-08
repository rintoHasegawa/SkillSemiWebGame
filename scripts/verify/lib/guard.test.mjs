/**
 * guard.test
 * 自動動作確認の接続先ガードを検証するユニットテスト
 * ローカルの client（:5173）・server（:3000）と data:/blob:/about: のみ許可し，
 * 本番（*.onrender.com）・研究室サーバ（192.168.0.10・:8803）は拒否リストで常に拒否することを検証する
 */
import { describe, expect, it } from "vitest";

import { CLIENT_URL, SERVER_URL, assertAllowedUrl, checkUrl } from "./guard.mjs";

describe("CLIENT_URL / SERVER_URL", () => {
  it("client の URL がローカルの 5173 番であること", () => {
    expect(CLIENT_URL).toBe("http://localhost:5173");
  });

  it("server の URL がローカルの 3000 番であること", () => {
    expect(SERVER_URL).toBe("http://localhost:3000");
  });

  it("client と server の URL 自体がガードを通ること", () => {
    expect([checkUrl(CLIENT_URL).allowed, checkUrl(SERVER_URL).allowed]).toEqual([true, true]);
  });
});

describe("checkUrl", () => {
  describe("許可", () => {
    it.each([
      "http://localhost:5173/",
      "http://localhost:3000/socket.io/?EIO=4&transport=polling",
      "ws://localhost:3000/socket.io/?EIO=4&transport=websocket",
      "http://127.0.0.1:5173/src/main.tsx",
      "http://127.0.0.1:3000/",
      "http://[::1]:5173/",
      "ws://[::1]:3000/",
      "http://LOCALHOST:5173/",
    ])("ローカルの client / server（%s）を許可すること", (url) => {
      expect(checkUrl(url).allowed).toBe(true);
    });

    it.each(["data:image/png;base64,AAAA", "blob:http://localhost:5173/abc", "about:blank"])(
      "ネットワークを伴わないスキーム（%s）を許可すること",
      (url) => {
        expect(checkUrl(url).allowed).toBe(true);
      },
    );
  });

  describe("拒否リスト", () => {
    it.each([
      "https://pixel-paint-war-client.onrender.com/",
      "https://skillsemiwebgame.onrender.com/socket.io/",
      "wss://skillsemiwebgame.onrender.com/socket.io/",
      "https://other-service.onrender.com/",
    ])("Render（%s）を拒否すること", (url) => {
      const result = checkUrl(url);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("拒否リスト");
    });

    it("研究室サーバ（192.168.0.10）を拒否すること", () => {
      const result = checkUrl("http://192.168.0.10:3000/");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("拒否リスト");
    });

    it("研究室サーバの公開ポート 8803 を拒否すること", () => {
      const result = checkUrl("http://192.168.0.10:8803/");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("拒否リスト");
    });

    it("ローカルホストでもポート 8803 は拒否リストで拒否すること", () => {
      const result = checkUrl("http://localhost:8803/");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("拒否リスト");
    });
  });

  describe("許可リスト外", () => {
    it.each([
      "http://localhost:3001/",
      "http://localhost:8080/",
      "http://localhost/",
      "https://localhost/",
      "http://127.0.0.1:4173/",
    ])("許可していないローカルポート（%s）を拒否すること", (url) => {
      expect(checkUrl(url).allowed).toBe(false);
    });

    it.each(["https://example.com/", "http://192.168.0.11:5173/", "http://10.0.0.1:3000/"])(
      "ローカル以外のホスト（%s）を拒否すること",
      (url) => {
        expect(checkUrl(url).allowed).toBe(false);
      },
    );

    it.each(["file:///etc/passwd", "ftp://localhost:3000/", "chrome://settings"])(
      "許可していないスキーム（%s）を拒否すること",
      (url) => {
        expect(checkUrl(url).allowed).toBe(false);
      },
    );

    it("URL として解釈できない文字列を拒否すること", () => {
      expect(checkUrl("not a url").allowed).toBe(false);
    });

    it("空文字を拒否すること", () => {
      expect(checkUrl("").allowed).toBe(false);
    });

    it("ローカルホストを装ったサブドメイン（localhost.example.com）を拒否すること", () => {
      expect(checkUrl("http://localhost.example.com:5173/").allowed).toBe(false);
    });

    it("認証情報部に localhost を含む URL は実ホストで判定して拒否すること", () => {
      expect(checkUrl("http://localhost:5173@skillsemiwebgame.onrender.com/").allowed).toBe(false);
    });
  });
});

describe("assertAllowedUrl", () => {
  it("許可された URL では例外を投げないこと", () => {
    expect(() => assertAllowedUrl("http://localhost:5173/", "client")).not.toThrow();
  });

  it("拒否された URL では接続先の説明と URL を含む例外を投げること", () => {
    expect(() => assertAllowedUrl("https://skillsemiwebgame.onrender.com/", "server")).toThrow(
      /server.*skillsemiwebgame\.onrender\.com/,
    );
  });
});
