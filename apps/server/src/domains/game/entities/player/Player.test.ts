/**
 * Player.test
 * プレイヤー状態モデルの現行挙動を固定する characterization test
 * コンストラクタ引数の保持と各フィールドの初期値・可変性を検証する
 */
import { describe, expect, it } from "vitest";

import { Player } from "./Player";

describe("Player.constructor", () => {
  it("第1引数のidを保持すること", () => {
    expect(new Player("socket-1", "たろう", 0).id).toBe("socket-1");
  });

  it("第2引数のnameを保持すること", () => {
    expect(new Player("socket-1", "たろう", 0).name).toBe("たろう");
  });

  it("第3引数のteamIdを保持すること", () => {
    expect(new Player("socket-1", "たろう", 2).teamId).toBe(2);
  });

  it("空文字のidをそのまま保持すること", () => {
    expect(new Player("", "たろう", 0).id).toBe("");
  });

  it("空文字のnameをそのまま保持すること", () => {
    expect(new Player("socket-1", "", 0).name).toBe("");
  });

  it("範囲外の負のteamIdでも検証せずそのまま保持すること", () => {
    expect(new Player("socket-1", "たろう", -1).teamId).toBe(-1);
  });

  it("TEAM_COUNT以上のteamIdでも検証せずそのまま保持すること", () => {
    expect(new Player("socket-1", "たろう", 99).teamId).toBe(99);
  });

  it("小数のteamIdでも検証せずそのまま保持すること", () => {
    expect(new Player("socket-1", "たろう", 1.5).teamId).toBe(1.5);
  });
});

describe("Player の初期フィールド", () => {
  it("xの初期値が0であること", () => {
    expect(new Player("socket-1", "たろう", 0).x).toBe(0);
  });

  it("yの初期値が0であること", () => {
    expect(new Player("socket-1", "たろう", 0).y).toBe(0);
  });

  it("initialXの初期値が0であること", () => {
    expect(new Player("socket-1", "たろう", 0).initialX).toBe(0);
  });

  it("initialYの初期値が0であること", () => {
    expect(new Player("socket-1", "たろう", 0).initialY).toBe(0);
  });

  it("paintCountの初期値が0であること", () => {
    expect(new Player("socket-1", "たろう", 0).paintCount).toBe(0);
  });

  it("bombHitCountの初期値が0であること", () => {
    expect(new Player("socket-1", "たろう", 0).bombHitCount).toBe(0);
  });
});

describe("Player のフィールド更新", () => {
  it("座標を後から書き換えられること", () => {
    const player = new Player("socket-1", "たろう", 0);
    player.x = 3.5;
    player.y = -2;

    expect([player.x, player.y]).toEqual([3.5, -2]);
  });

  it("initialX・initialYを後から書き換えられること", () => {
    const player = new Player("socket-1", "たろう", 0);
    player.initialX = 10;
    player.initialY = 20;

    expect([player.initialX, player.initialY]).toEqual([10, 20]);
  });

  it("paintCountをインクリメントできること", () => {
    const player = new Player("socket-1", "たろう", 0);
    player.paintCount += 1;

    expect(player.paintCount).toBe(1);
  });

  it("bombHitCountをインクリメントできること", () => {
    const player = new Player("socket-1", "たろう", 0);
    player.bombHitCount += 1;

    expect(player.bombHitCount).toBe(1);
  });

  it("インスタンスごとに状態が独立していること", () => {
    const first = new Player("socket-1", "たろう", 0);
    const second = new Player("socket-2", "はなこ", 1);
    first.paintCount = 5;

    expect(second.paintCount).toBe(0);
  });
});
