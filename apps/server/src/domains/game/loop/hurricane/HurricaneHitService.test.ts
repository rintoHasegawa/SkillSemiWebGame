/**
 * HurricaneHitService.test
 * ハリケーン被弾判定を検証する
 * 判定半径の境界値・セッション経過時間基準のクールダウン境界・
 * 中立ハザードとしてのチーム非依存性・初期化を検証する
 */
import { describe, expect, it } from "vitest";

import { Player } from "../../entities/player/Player";
import { createPlayerEntity } from "@server/testing/playerFixtures";
import { HurricaneHitService } from "./HurricaneHitService";
import type { HurricaneState } from "./hurricaneTypes";

const COOLDOWN_MS = 3000;

/** テスト用のハリケーン状態を生成する */
const createHurricane = (
  overrides: Partial<HurricaneState> = {},
): HurricaneState => {
  return {
    id: "hurricane-1",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 1.5,
    rotationRad: 0,
    ...overrides,
  };
};

/** 座標を位置引数で指定してテスト用のプレイヤーを生成する */
const createPlayer = (
  id: string,
  x: number,
  y: number,
  teamId = 0,
): Player => {
  return createPlayerEntity({ id, x, y, teamId });
};

/** プレイヤー配列をIDキーのMapへ変換する */
const toPlayerMap = (players: Player[]): Map<string, Player> => {
  return new Map(players.map((player) => [player.id, player]));
};

describe("HurricaneHitService.collectHitPlayerIds", () => {
  it("ハリケーンが存在しない場合は空配列を返すこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);

    expect(service.collectHitPlayerIds([], players, 0)).toEqual([]);
  });

  it("プレイヤーが存在しない場合は空配列を返すこと", () => {
    const service = new HurricaneHitService();

    expect(
      service.collectHitPlayerIds([createHurricane()], new Map(), 0),
    ).toEqual([]);
  });

  it("判定半径内のプレイヤーIDを返すこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 1, 0)]);

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 0),
    ).toEqual(["player-1"]);
  });

  it("判定半径外のプレイヤーIDを返さないこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 3, 0)]);

    expect(service.collectHitPlayerIds([createHurricane()], players, 0)).toEqual(
      [],
    );
  });

  it("距離が半径の和とちょうど等しい場合は被弾としないこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 2, 0)]);

    expect(service.collectHitPlayerIds([createHurricane()], players, 0)).toEqual(
      [],
    );
  });

  it("距離が半径の和をわずかに下回る場合は被弾とすること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 1.999, 0)]);

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 0),
    ).toEqual(["player-1"]);
  });

  it("teamIdが未確定（-1）のプレイヤーも中立ハザードとして被弾すること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0, -1)]);

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 0),
    ).toEqual(["player-1"]);
  });

  it("すべてのチームのプレイヤーが等しく被弾すること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([
      createPlayer("player-0", 0, 0, 0),
      createPlayer("player-1", 0, 0, 1),
      createPlayer("player-2", 0, 0, 2),
      createPlayer("player-3", 0, 0, 3),
    ]);

    expect(service.collectHitPlayerIds([createHurricane()], players, 0)).toEqual(
      ["player-0", "player-1", "player-2", "player-3"],
    );
  });

  it("複数ハリケーンのいずれかに接触していれば被弾とすること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 8, 0)]);
    const hurricanes = [
      createHurricane({ id: "hurricane-1", x: 0, y: 0 }),
      createHurricane({ id: "hurricane-2", x: 8, y: 0 }),
    ];

    expect(service.collectHitPlayerIds(hurricanes, players, 0)).toEqual([
      "player-1",
    ]);
  });

  it("被弾した複数プレイヤーをMapの登録順で返すこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([
      createPlayer("player-2", 0, 0),
      createPlayer("player-1", 0, 1),
    ]);

    expect(service.collectHitPlayerIds([createHurricane()], players, 0)).toEqual(
      ["player-2", "player-1"],
    );
  });

  it("セッション経過時間でクールダウン未満なら再び被弾としないこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);
    service.collectHitPlayerIds([createHurricane()], players, 1000);

    expect(
      service.collectHitPlayerIds(
        [createHurricane()],
        players,
        1000 + COOLDOWN_MS - 1,
      ),
    ).toEqual([]);
  });

  it("セッション経過時間の差がクールダウンと等しければ再び被弾とすること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);
    service.collectHitPlayerIds([createHurricane()], players, 1000);

    expect(
      service.collectHitPlayerIds(
        [createHurricane()],
        players,
        1000 + COOLDOWN_MS,
      ),
    ).toEqual(["player-1"]);
  });

  it("経過時間が巻き戻った場合はクールダウン中として被弾しないこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);
    service.collectHitPlayerIds([createHurricane()], players, 10000);

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 0),
    ).toEqual([]);
  });

  it("セッション開始直後の経過時間0でも被弾を判定すること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 0),
    ).toEqual(["player-1"]);
  });

  it("長時間経過後でも経過時間の差だけでクールダウンを判定すること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);
    service.collectHitPlayerIds([createHurricane()], players, 60_000);

    expect(
      service.collectHitPlayerIds(
        [createHurricane()],
        players,
        60_000 + COOLDOWN_MS,
      ),
    ).toEqual(["player-1"]);
  });

  it("被弾しなかったプレイヤーにはクールダウンを記録しないこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 3, 0)]);
    service.collectHitPlayerIds([createHurricane()], players, 0);
    players.get("player-1")!.x = 0;

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 1),
    ).toEqual(["player-1"]);
  });

  it("ハリケーンが空の呼び出しではクールダウンを記録しないこと", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);
    service.collectHitPlayerIds([], players, 0);

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 1),
    ).toEqual(["player-1"]);
  });
});

describe("HurricaneHitService.clear", () => {
  it("クールダウン記録を初期化して直後でも再び被弾とすること", () => {
    const service = new HurricaneHitService();
    const players = toPlayerMap([createPlayer("player-1", 0, 0)]);
    service.collectHitPlayerIds([createHurricane()], players, 1000);

    service.clear();

    expect(
      service.collectHitPlayerIds([createHurricane()], players, 1001),
    ).toEqual(["player-1"]);
  });

  it("被弾記録がない状態で呼んでも例外を投げないこと", () => {
    const service = new HurricaneHitService();

    expect(() => service.clear()).not.toThrow();
  });
});
