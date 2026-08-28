/**
 * GameHandler.test
 * ゲーム向けソケット操作の現行挙動を固定する characterization test
 * 購読・購読解除・送信がどのイベント名へ結線されるかを検証する
 */
import { describe, expect, it } from "vitest";
import type { BombHitReportPayload, PlaceBombPayload } from "@repo/shared";

import { createGameHandler, type GameHandler } from "./GameHandler";
import { createSocketStub } from "./socketTestStub";

// 全購読APIで共用できるよう，引数を取らないコールバックを使う
type SubscriptionCallback = () => void;

type SubscriptionCase = {
  label: string;
  event: string;
  subscribe: (handler: GameHandler, callback: SubscriptionCallback) => void;
  unsubscribe: (handler: GameHandler, callback: SubscriptionCallback) => void;
};

// on/off ペアの結線先イベント名をリテラルで固定する
const subscriptionCases: SubscriptionCase[] = [
  {
    label: "CurrentPlayers",
    event: "current-players",
    subscribe: (handler, callback) => handler.onCurrentPlayers(callback),
    unsubscribe: (handler, callback) => handler.offCurrentPlayers(callback),
  },
  {
    label: "NewPlayer",
    event: "new-player",
    subscribe: (handler, callback) => handler.onNewPlayer(callback),
    unsubscribe: (handler, callback) => handler.offNewPlayer(callback),
  },
  {
    label: "UpdatePlayers",
    event: "update-players",
    subscribe: (handler, callback) => handler.onUpdatePlayers(callback),
    unsubscribe: (handler, callback) => handler.offUpdatePlayers(callback),
  },
  {
    label: "RemovePlayer",
    event: "remove-player",
    subscribe: (handler, callback) => handler.onRemovePlayer(callback),
    unsubscribe: (handler, callback) => handler.offRemovePlayer(callback),
  },
  {
    label: "UpdateMapCells",
    event: "update-map-cells",
    subscribe: (handler, callback) => handler.onUpdateMapCells(callback),
    unsubscribe: (handler, callback) => handler.offUpdateMapCells(callback),
  },
  {
    label: "CurrentHurricanes",
    event: "current-hurricanes",
    subscribe: (handler, callback) => handler.onCurrentHurricanes(callback),
    unsubscribe: (handler, callback) => handler.offCurrentHurricanes(callback),
  },
  {
    label: "UpdateHurricanes",
    event: "update-hurricanes",
    subscribe: (handler, callback) => handler.onUpdateHurricanes(callback),
    unsubscribe: (handler, callback) => handler.offUpdateHurricanes(callback),
  },
  {
    label: "GameEnd",
    event: "game-end",
    subscribe: (handler, callback) => handler.onGameEnd(callback),
    unsubscribe: (handler, callback) => handler.offGameEnd(callback),
  },
  {
    label: "GameResult",
    event: "game-result",
    subscribe: (handler, callback) => handler.onGameResult(callback),
    unsubscribe: (handler, callback) => handler.offGameResult(callback),
  },
  {
    label: "BombPlaced",
    event: "bomb-placed",
    subscribe: (handler, callback) => handler.onBombPlaced(callback),
    unsubscribe: (handler, callback) => handler.offBombPlaced(callback),
  },
  {
    label: "BombPlacedAck",
    event: "bomb-placed-ack",
    subscribe: (handler, callback) => handler.onBombPlacedAck(callback),
    unsubscribe: (handler, callback) => handler.offBombPlacedAck(callback),
  },
  {
    label: "PlayerHit",
    event: "player-hit",
    subscribe: (handler, callback) => handler.onPlayerHit(callback),
    unsubscribe: (handler, callback) => handler.offPlayerHit(callback),
  },
  {
    label: "HurricaneHit",
    event: "hurricane-hit",
    subscribe: (handler, callback) => handler.onHurricaneHit(callback),
    unsubscribe: (handler, callback) => handler.offHurricaneHit(callback),
  },
];

/** [テスト名, 渡す x, 渡す y, 送信されるべき座標] */
type SendMoveCase = [
  name: string,
  x: number,
  y: number,
  expected: { x: number; y: number },
];

// 座標値がそのまま move のペイロードへ載ることをリテラルで固定する
const sendMoveCases: SendMoveCase[] = [
  [
    "sendMove が move イベントへ座標オブジェクトを送信すること",
    12,
    34,
    { x: 12, y: 34 },
  ],
  ["sendMove が座標0でもそのまま送信すること", 0, 0, { x: 0, y: 0 }],
  [
    "sendMove が負値座標もそのまま送信すること",
    -1.5,
    -2.5,
    { x: -1.5, y: -2.5 },
  ],
];

describe("createGameHandler", () => {
  it("生成時点ではソケット操作を行わないこと", () => {
    const { socket, onCalls, onceCalls, offCalls, emitCalls } =
      createSocketStub();

    createGameHandler(socket);

    expect({ onCalls, onceCalls, offCalls, emitCalls }).toEqual({
      onCalls: [],
      onceCalls: [],
      offCalls: [],
      emitCalls: [],
    });
  });

  it.each(subscriptionCases)(
    "on$label が $event イベントへ同じコールバックを登録すること",
    ({ subscribe, event }) => {
      const { socket, onCalls } = createSocketStub();
      const handler = createGameHandler(socket);
      const callback = () => undefined;

      subscribe(handler, callback);

      expect(onCalls).toEqual([{ event, callback }]);
    },
  );

  it.each(subscriptionCases)(
    "off$label が $event イベントへ同じコールバックで解除を委譲すること",
    ({ unsubscribe, event }) => {
      const { socket, offCalls } = createSocketStub();
      const handler = createGameHandler(socket);
      const callback = () => undefined;

      unsubscribe(handler, callback);

      expect(offCalls).toEqual([{ event, callback }]);
    },
  );

  it.each(subscriptionCases)(
    "on$label が once・emit を使わないこと",
    ({ subscribe, event }) => {
      const { socket, onCalls, onceCalls, emitCalls } = createSocketStub();
      const handler = createGameHandler(socket);

      subscribe(handler, () => undefined);

      expect({
        onEvents: onCalls.map((call) => call.event),
        onceCalls,
        emitCalls,
      }).toEqual({ onEvents: [event], onceCalls: [], emitCalls: [] });
    },
  );

  it("onGameStart が game-start イベントへ on で登録すること", () => {
    const { socket, onCalls, onceCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const callback = () => undefined;

    handler.onGameStart(callback);

    expect({ onCalls, onceCalls }).toEqual({
      onCalls: [{ event: "game-start", callback }],
      onceCalls: [],
    });
  });

  it("onceGameStart が game-start イベントへ once で登録すること", () => {
    const { socket, onCalls, onceCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const callback = () => undefined;

    handler.onceGameStart(callback);

    expect({ onCalls, onceCalls }).toEqual({
      onCalls: [],
      onceCalls: [{ event: "game-start", callback }],
    });
  });

  it("offGameStart が game-start イベントへ解除を委譲すること", () => {
    const { socket, offCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const callback = () => undefined;

    handler.offGameStart(callback);

    expect(offCalls).toEqual([{ event: "game-start", callback }]);
  });

  it.each(sendMoveCases)("%s", (_name, x, y, expected) => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);

    handler.sendMove(x, y);

    expect(emitCalls).toEqual([{ event: "move", args: [expected] }]);
  });

  it("sendPlaceBomb が place-bomb イベントへ送信すること", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const payload: PlaceBombPayload = {
      requestId: "req-1",
      x: 3,
      y: 4,
      explodeAtElapsedMs: 5000,
    };

    handler.sendPlaceBomb(payload);

    expect(emitCalls).toEqual([{ event: "place-bomb", args: [payload] }]);
  });

  it("sendPlaceBomb がペイロードを同一参照のまま透過すること", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const payload: PlaceBombPayload = {
      requestId: "req-2",
      x: 0,
      y: 0,
      explodeAtElapsedMs: 0,
    };

    handler.sendPlaceBomb(payload);

    expect(emitCalls[0]?.args[0]).toBe(payload);
  });

  it("sendBombHitReport が bomb-hit-report イベントへ送信すること", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const payload: BombHitReportPayload = { bombId: "bomb-1" };

    handler.sendBombHitReport(payload);

    expect(emitCalls).toEqual([{ event: "bomb-hit-report", args: [payload] }]);
  });

  it("sendBombHitReport がペイロードを同一参照のまま透過すること", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const payload: BombHitReportPayload = { bombId: "bomb-2" };

    handler.sendBombHitReport(payload);

    expect(emitCalls[0]?.args[0]).toBe(payload);
  });

  it("readyForGame が ready-for-game イベントを引数なしで送信すること", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);

    handler.readyForGame();

    expect(emitCalls).toEqual([{ event: "ready-for-game", args: [] }]);
  });

  it("readyForGame が undefined すら引数に含めないこと", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);

    handler.readyForGame();

    expect(emitCalls[0]?.args).toHaveLength(0);
  });

  it("送信APIが購読を行わないこと", () => {
    const { socket, onCalls, onceCalls, offCalls } = createSocketStub();
    const handler = createGameHandler(socket);

    handler.sendMove(1, 2);
    handler.sendPlaceBomb({
      requestId: "req-3",
      x: 1,
      y: 2,
      explodeAtElapsedMs: 100,
    });
    handler.sendBombHitReport({ bombId: "bomb-3" });
    handler.readyForGame();

    expect({ onCalls, onceCalls, offCalls }).toEqual({
      onCalls: [],
      onceCalls: [],
      offCalls: [],
    });
  });

  it("複数の購読・送信を呼び出し順どおりに委譲すること", () => {
    const { socket, onCalls, emitCalls } = createSocketStub();
    const handler = createGameHandler(socket);
    const first = () => undefined;
    const second = () => undefined;

    handler.onCurrentPlayers(first);
    handler.onUpdatePlayers(second);
    handler.sendMove(1, 1);
    handler.readyForGame();

    expect({
      onCalls,
      emitEvents: emitCalls.map((call) => call.event),
    }).toEqual({
      onCalls: [
        { event: "current-players", callback: first },
        { event: "update-players", callback: second },
      ],
      emitEvents: ["move", "ready-for-game"],
    });
  });
});
