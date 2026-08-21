/**
 * socketEvents.test
 * ソケットイベント名定数の契約を固定するテスト
 * `*_SYNC` エイリアス廃止後もワイヤ上のイベント名が不変であることと，
 * 定数キー・イベント名がともに一意であることを検証する
 */
import { describe, expect, it } from "vitest";

import { SocketEvents } from "./socketEvents";

// 廃止した `*_SYNC` エイリアスのキー名
const removedSyncAliasKeys = [
  "CURRENT_PLAYERS_SYNC",
  "NEW_PLAYER_SYNC",
  "UPDATE_PLAYERS_SYNC",
  "REMOVE_PLAYER_SYNC",
  "UPDATE_MAP_CELLS_SYNC",
  "CURRENT_HURRICANES_SYNC",
  "UPDATE_HURRICANES_SYNC",
] as const;

// エイリアス廃止対象だったイベントの本キーとワイヤ上のイベント名
const retainedEventNamePairs = [
  ["CURRENT_PLAYERS", "current-players"],
  ["NEW_PLAYER", "new-player"],
  ["UPDATE_PLAYERS", "update-players"],
  ["REMOVE_PLAYER", "remove-player"],
  ["UPDATE_MAP_CELLS", "update-map-cells"],
  ["CURRENT_HURRICANES", "current-hurricanes"],
  ["UPDATE_HURRICANES", "update-hurricanes"],
] as const satisfies ReadonlyArray<
  readonly [keyof typeof SocketEvents, string]
>;

describe("SocketEvents", () => {
  it.each(removedSyncAliasKeys)("%s エイリアスを公開しないこと", (aliasKey) => {
    expect(Object.keys(SocketEvents)).not.toContain(aliasKey);
  });

  it.each(retainedEventNamePairs)(
    "%s のイベント名が %s のまま変わらないこと",
    (eventKey, eventName) => {
      expect(SocketEvents[eventKey]).toBe(eventName);
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

  it("重複するイベント名が存在しないこと", () => {
    const values = Object.values(SocketEvents);

    expect(new Set(values).size).toBe(values.length);
  });
});
