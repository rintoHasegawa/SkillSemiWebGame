/**
 * socketEventBridge.test
 * ソケットブリッジの委譲挙動を固定する characterization test
 * 受信登録・解除の素通しと，ペイロード有無による emit 引数の分岐を検証する
 */
import { describe, expect, it } from "vitest";

import {
  createSocketEventBridge,
  type SocketBridgeTarget,
} from "./socketEventBridge";

type InboundMap = {
  "player-hit": { playerId: string };
  "game-end": undefined;
};

type OutboundMap = {
  move: { x: number; y: number };
  ping: undefined;
  reset: null;
  toggle: boolean;
  score: number;
};

type RecordedCall = {
  method: "on" | "once" | "off" | "emit";
  args: unknown[];
};

// ソケット呼び出しの記録用ターゲットとブリッジを組み立てる
const createTestBridge = () => {
  const calls: RecordedCall[] = [];

  const socket: SocketBridgeTarget = {
    on: (event, callback) => {
      calls.push({ method: "on", args: [event, callback] });
    },
    once: (event, callback) => {
      calls.push({ method: "once", args: [event, callback] });
    },
    off: (event, callback) => {
      calls.push({ method: "off", args: [event, callback] });
    },
    emit: (event: string, ...rest: unknown[]) => {
      calls.push({ method: "emit", args: [event, ...rest] });
    },
  };

  const bridge = createSocketEventBridge<InboundMap, OutboundMap>(socket);

  return { bridge, calls };
};

describe("createSocketEventBridge", () => {
  it("onEvent・onceEvent・offEvent・emitEvent を公開すること", () => {
    const { bridge } = createTestBridge();

    expect(Object.keys(bridge).sort()).toEqual([
      "emitEvent",
      "offEvent",
      "onEvent",
      "onceEvent",
    ]);
  });

  it("生成時点ではソケットを呼び出さないこと", () => {
    const { calls } = createTestBridge();

    expect(calls).toEqual([]);
  });
});

describe("onEvent", () => {
  it("socket.on へイベント名とコールバックをそのまま渡すこと", () => {
    const { bridge, calls } = createTestBridge();
    const callback = () => undefined;

    bridge.onEvent("player-hit", callback);

    expect(calls).toEqual([
      { method: "on", args: ["player-hit", callback] },
    ]);
  });

  it("登録時点ではコールバックを実行しないこと", () => {
    const { bridge } = createTestBridge();
    let calledCount = 0;

    bridge.onEvent("player-hit", () => {
      calledCount += 1;
    });

    expect(calledCount).toBe(0);
  });

  it("登録したコールバックが受信ペイロードをそのまま受け取ること", () => {
    const { bridge, calls } = createTestBridge();
    const received: InboundMap["player-hit"][] = [];

    bridge.onEvent("player-hit", (payload) => {
      received.push(payload);
    });
    const registered = calls[0].args[1] as (payload: unknown) => void;
    registered({ playerId: "p1" });

    expect(received).toEqual([{ playerId: "p1" }]);
  });

  it("同一イベントへの複数登録をすべて素通しすること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.onEvent("player-hit", () => undefined);
    bridge.onEvent("player-hit", () => undefined);

    expect(calls).toHaveLength(2);
  });
});

describe("onceEvent", () => {
  it("socket.once へイベント名とコールバックをそのまま渡すこと", () => {
    const { bridge, calls } = createTestBridge();
    const callback = () => undefined;

    bridge.onceEvent("game-end", callback);

    expect(calls).toEqual([
      { method: "once", args: ["game-end", callback] },
    ]);
  });

  it("socket.on は呼び出さないこと", () => {
    const { bridge, calls } = createTestBridge();

    bridge.onceEvent("game-end", () => undefined);

    expect(calls.some((call) => call.method === "on")).toBe(false);
  });
});

describe("offEvent", () => {
  it("socket.off へイベント名とコールバックをそのまま渡すこと", () => {
    const { bridge, calls } = createTestBridge();
    const callback = () => undefined;

    bridge.offEvent("player-hit", callback);

    expect(calls).toEqual([
      { method: "off", args: ["player-hit", callback] },
    ]);
  });

  it("未登録のコールバックを解除しても例外を投げないこと", () => {
    const { bridge } = createTestBridge();

    expect(() => bridge.offEvent("player-hit", () => undefined)).not.toThrow();
  });
});

describe("emitEvent", () => {
  it("ペイロードを省略した場合はイベント名のみで emit すること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.emitEvent("ping");

    expect(calls).toEqual([{ method: "emit", args: ["ping"] }]);
  });

  it("ペイロードを指定した場合はイベント名とペイロードで emit すること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.emitEvent("move", { x: 1, y: 2 });

    expect(calls).toEqual([
      { method: "emit", args: ["move", { x: 1, y: 2 }] },
    ]);
  });

  it("ペイロード参照をコピーせずそのまま渡すこと", () => {
    const { bridge, calls } = createTestBridge();
    const payload = { x: 1, y: 2 };

    bridge.emitEvent("move", payload);

    expect(calls[0].args[1]).toBe(payload);
  });

  it("undefined を明示指定した場合はペイロードなしとして emit すること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.emitEvent("ping", undefined);

    expect(calls).toEqual([{ method: "emit", args: ["ping"] }]);
  });

  it("null を指定した場合はペイロードとして emit すること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.emitEvent("reset", null);

    expect(calls).toEqual([{ method: "emit", args: ["reset", null] }]);
  });

  it("false を指定した場合もペイロードとして emit すること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.emitEvent("toggle", false);

    expect(calls).toEqual([{ method: "emit", args: ["toggle", false] }]);
  });

  it("0 を指定した場合もペイロードとして emit すること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.emitEvent("score", 0);

    expect(calls).toEqual([{ method: "emit", args: ["score", 0] }]);
  });

  it("連続した emit を呼び出し順に素通しすること", () => {
    const { bridge, calls } = createTestBridge();

    bridge.emitEvent("ping");
    bridge.emitEvent("score", 1);

    expect(calls.map((call) => call.args[0])).toEqual(["ping", "score"]);
  });
});
