/**
 * gamePayloadSanitizers.test
 * UPDATE_PLAYERS 送信値の正規化と差分抽出の現行挙動を固定する characterization test
 * 量子化の丸め・非有限値・キャッシュ副作用の境界挙動を検証する
 */
import type { UpdatePlayersPayload } from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  collectChangedUpdatePlayersPayload,
  filterUnchangedUpdatePlayersPayload,
  quantizeUpdatePlayersPayload,
  sanitizeUpdatePlayersPayload,
} from "./gamePayloadSanitizers";

type PositionCache = Map<string, { x: number; y: number }>;

describe("quantizeUpdatePlayersPayload", () => {
  it("空配列の場合は空配列を返すこと", () => {
    expect(quantizeUpdatePlayersPayload([])).toEqual([]);
  });

  it("座標を小数第2位へ丸めること", () => {
    const players: UpdatePlayersPayload = [
      { id: "p1", x: 1.23456, y: 2.98765 },
    ];

    expect(quantizeUpdatePlayersPayload(players)).toEqual([
      { id: "p1", x: 1.23, y: 2.99 },
    ]);
  });

  it("浮動小数誤差により1.005は1へ丸められること", () => {
    const players: UpdatePlayersPayload = [{ id: "p1", x: 1.005, y: 0 }];

    expect(quantizeUpdatePlayersPayload(players)[0]?.x).toBe(1);
  });

  it("誤差の影響がない0.125は0.13へ丸められること", () => {
    const players: UpdatePlayersPayload = [{ id: "p1", x: 0.125, y: 0 }];

    expect(quantizeUpdatePlayersPayload(players)[0]?.x).toBe(0.13);
  });

  it("負値の座標も量子化すること", () => {
    const players: UpdatePlayersPayload = [{ id: "p1", x: -1.2345, y: -0.001 }];

    expect(quantizeUpdatePlayersPayload(players)).toEqual([
      { id: "p1", x: -1.23, y: 0 },
    ]);
  });

  it("量子化結果が負のゼロにならないこと", () => {
    const players: UpdatePlayersPayload = [{ id: "p1", x: -0.001, y: -0 }];
    const quantized = quantizeUpdatePlayersPayload(players);

    expect(Object.is(quantized[0]?.x, 0)).toBe(true);
  });

  it("0の座標はそのまま0を返すこと", () => {
    const players: UpdatePlayersPayload = [{ id: "p1", x: 0, y: 0 }];

    expect(quantizeUpdatePlayersPayload(players)).toEqual([
      { id: "p1", x: 0, y: 0 },
    ]);
  });

  it("NaNの座標は0へ置換すること", () => {
    const players: UpdatePlayersPayload = [
      { id: "p1", x: Number.NaN, y: Number.NaN },
    ];

    expect(quantizeUpdatePlayersPayload(players)).toEqual([
      { id: "p1", x: 0, y: 0 },
    ]);
  });

  it("Infinityの座標は0へ置換すること", () => {
    const players: UpdatePlayersPayload = [
      { id: "p1", x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
    ];

    expect(quantizeUpdatePlayersPayload(players)).toEqual([
      { id: "p1", x: 0, y: 0 },
    ]);
  });

  it("idはそのまま保持すること", () => {
    const players: UpdatePlayersPayload = [{ id: "socket-1", x: 1, y: 1 }];

    expect(quantizeUpdatePlayersPayload(players)[0]?.id).toBe("socket-1");
  });

  it("入力配列の要素を書き換えないこと", () => {
    const players: UpdatePlayersPayload = [{ id: "p1", x: 1.23456, y: 1 }];

    quantizeUpdatePlayersPayload(players);

    expect(players[0]?.x).toBe(1.23456);
  });

  it("新しい配列インスタンスを返すこと", () => {
    const players: UpdatePlayersPayload = [{ id: "p1", x: 1, y: 1 }];

    expect(quantizeUpdatePlayersPayload(players)).not.toBe(players);
  });

  it("複数要素の順序を保持すること", () => {
    const players: UpdatePlayersPayload = [
      { id: "p2", x: 1, y: 1 },
      { id: "p1", x: 2, y: 2 },
    ];

    expect(quantizeUpdatePlayersPayload(players).map((p) => p.id)).toEqual([
      "p2",
      "p1",
    ]);
  });

  it("id/x/y以外のフィールドは出力へ含めないこと", () => {
    const players = [
      { id: "p1", x: 1, y: 2, teamId: 3 },
    ] as unknown as UpdatePlayersPayload;

    expect(quantizeUpdatePlayersPayload(players)[0]).toEqual({
      id: "p1",
      x: 1,
      y: 2,
    });
  });
});

describe("collectChangedUpdatePlayersPayload", () => {
  it("空配列の場合は空配列を返すこと", () => {
    expect(collectChangedUpdatePlayersPayload([], new Map())).toEqual([]);
  });

  it("キャッシュが空の場合は全要素を返すこと", () => {
    const players: UpdatePlayersPayload = [
      { id: "p1", x: 1, y: 1 },
      { id: "p2", x: 2, y: 2 },
    ];

    expect(collectChangedUpdatePlayersPayload(players, new Map())).toEqual(
      players,
    );
  });

  it("キャッシュへ送信座標を書き込むこと", () => {
    const cache: PositionCache = new Map();

    collectChangedUpdatePlayersPayload([{ id: "p1", x: 1, y: 2 }], cache);

    expect(cache.get("p1")).toEqual({ x: 1, y: 2 });
  });

  it("前回と同一座標の要素は除外すること", () => {
    const cache: PositionCache = new Map([["p1", { x: 1, y: 2 }]]);

    expect(
      collectChangedUpdatePlayersPayload([{ id: "p1", x: 1, y: 2 }], cache),
    ).toEqual([]);
  });

  it("x座標のみ変化した要素は差分として返すこと", () => {
    const cache: PositionCache = new Map([["p1", { x: 1, y: 2 }]]);

    expect(
      collectChangedUpdatePlayersPayload([{ id: "p1", x: 1.01, y: 2 }], cache),
    ).toEqual([{ id: "p1", x: 1.01, y: 2 }]);
  });

  it("y座標のみ変化した要素は差分として返すこと", () => {
    const cache: PositionCache = new Map([["p1", { x: 1, y: 2 }]]);

    expect(
      collectChangedUpdatePlayersPayload([{ id: "p1", x: 1, y: 2.5 }], cache),
    ).toEqual([{ id: "p1", x: 1, y: 2.5 }]);
  });

  it("変化した要素のみ抽出すること", () => {
    const cache: PositionCache = new Map([
      ["p1", { x: 1, y: 1 }],
      ["p2", { x: 2, y: 2 }],
    ]);

    const changed = collectChangedUpdatePlayersPayload(
      [
        { id: "p1", x: 1, y: 1 },
        { id: "p2", x: 3, y: 2 },
      ],
      cache,
    );

    expect(changed.map((player) => player.id)).toEqual(["p2"]);
  });

  it("差分ありの要素はキャッシュを上書きすること", () => {
    const cache: PositionCache = new Map([["p1", { x: 1, y: 1 }]]);

    collectChangedUpdatePlayersPayload([{ id: "p1", x: 5, y: 6 }], cache);

    expect(cache.get("p1")).toEqual({ x: 5, y: 6 });
  });

  it("入力に含まれないIDのキャッシュは保持すること", () => {
    const cache: PositionCache = new Map([["p9", { x: 9, y: 9 }]]);

    collectChangedUpdatePlayersPayload([{ id: "p1", x: 1, y: 1 }], cache);

    expect(cache.get("p9")).toEqual({ x: 9, y: 9 });
  });

  it("量子化していない座標もそのまま差分判定に用いること", () => {
    const cache: PositionCache = new Map([["p1", { x: 1.234567, y: 0 }]]);

    expect(
      collectChangedUpdatePlayersPayload(
        [{ id: "p1", x: 1.234567, y: 0 }],
        cache,
      ),
    ).toEqual([]);
  });

  it("0と-0の座標は同一とみなして除外すること", () => {
    const cache: PositionCache = new Map([["p1", { x: 0, y: 0 }]]);

    expect(
      collectChangedUpdatePlayersPayload([{ id: "p1", x: -0, y: 0 }], cache),
    ).toEqual([]);
  });

  it("前回もNaNの座標は同一とみなして除外すること", () => {
    const cache: PositionCache = new Map([["p1", { x: Number.NaN, y: 0 }]]);

    expect(
      collectChangedUpdatePlayersPayload(
        [{ id: "p1", x: Number.NaN, y: 0 }],
        cache,
      ),
    ).toEqual([]);
  });

  it("前回NaNの座標が有限値へ変わった場合は差分として返すこと", () => {
    const cache: PositionCache = new Map([["p1", { x: Number.NaN, y: 0 }]]);

    expect(
      collectChangedUpdatePlayersPayload([{ id: "p1", x: 1, y: 0 }], cache),
    ).toHaveLength(1);
  });

  it("返却要素は入力オブジェクトの参照そのものであること", () => {
    const player = { id: "p1", x: 1, y: 1 };

    const changed = collectChangedUpdatePlayersPayload([player], new Map());

    expect(changed[0]).toBe(player);
  });
});

describe("sanitizeUpdatePlayersPayload", () => {
  it("quantizeUpdatePlayersPayloadと同一の関数であること", () => {
    expect(sanitizeUpdatePlayersPayload).toBe(quantizeUpdatePlayersPayload);
  });

  it("互換名でも量子化結果を返すこと", () => {
    expect(sanitizeUpdatePlayersPayload([{ id: "p1", x: 1.239, y: 0 }])).toEqual(
      [{ id: "p1", x: 1.24, y: 0 }],
    );
  });
});

describe("filterUnchangedUpdatePlayersPayload", () => {
  it("collectChangedUpdatePlayersPayloadと同一の関数であること", () => {
    expect(filterUnchangedUpdatePlayersPayload).toBe(
      collectChangedUpdatePlayersPayload,
    );
  });

  it("互換名でも差分抽出結果を返すこと", () => {
    const cache: PositionCache = new Map([["p1", { x: 1, y: 1 }]]);

    expect(
      filterUnchangedUpdatePlayersPayload([{ id: "p1", x: 1, y: 1 }], cache),
    ).toEqual([]);
  });
});
