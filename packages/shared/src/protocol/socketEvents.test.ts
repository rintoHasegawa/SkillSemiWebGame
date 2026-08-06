/**
 * socketEvents.test
 * ソケットイベント名定数の関係性を固定する characterization test
 * 旧キーと _SYNC エイリアスの一致・イベント名書式・意図しない重複の不在を検証する
 */
import { describe, expect, it } from "vitest";

import { SocketEvents } from "./socketEvents";

// 旧キーと _SYNC エイリアスの対応表
const syncAliasPairs = [
  ["CURRENT_PLAYERS_SYNC", "CURRENT_PLAYERS"],
  ["NEW_PLAYER_SYNC", "NEW_PLAYER"],
  ["UPDATE_PLAYERS_SYNC", "UPDATE_PLAYERS"],
  ["REMOVE_PLAYER_SYNC", "REMOVE_PLAYER"],
  ["UPDATE_MAP_CELLS_SYNC", "UPDATE_MAP_CELLS"],
  ["CURRENT_HURRICANES_SYNC", "CURRENT_HURRICANES"],
  ["UPDATE_HURRICANES_SYNC", "UPDATE_HURRICANES"],
] as const satisfies ReadonlyArray<
  readonly [keyof typeof SocketEvents, keyof typeof SocketEvents]
>;

describe("SocketEvents", () => {
  it.each(syncAliasPairs)(
    "%s が %s と同じイベント名を指すこと",
    (syncKey, legacyKey) => {
      expect(SocketEvents[syncKey]).toBe(SocketEvents[legacyKey]);
    },
  );

  it("すべてのイベント名が空でない文字列であること", () => {
    const values = Object.values(SocketEvents);

    expect(values.every((value) => value.length > 0)).toBe(true);
  });

  it("すべてのイベント名が小文字ハイフン区切りであること", () => {
    const values = Object.values(SocketEvents);

    expect(values.every((value) => /^[a-z]+(-[a-z]+)*$/.test(value))).toBe(
      true,
    );
  });

  it("重複するイベント名が _SYNC エイリアス分のみであること", () => {
    const values = Object.values(SocketEvents);
    const uniqueValues = new Set(values);

    expect(values.length - uniqueValues.size).toBe(syncAliasPairs.length);
  });

  it("エイリアスを除いたイベント名が一意であること", () => {
    const aliasKeys = new Set<string>(
      syncAliasPairs.map(([syncKey]) => syncKey),
    );
    const values = Object.entries(SocketEvents)
      .filter(([key]) => !aliasKeys.has(key))
      .map(([, value]) => value);

    expect(new Set(values).size).toBe(values.length);
  });
});
