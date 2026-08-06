/**
 * CombatSyncHandler.test
 * 戦闘イベント橋渡しの現行挙動を固定する characterization test
 * 各受信イベントの転送先とペイロード同一性を検証する
 */
import { describe, expect, it } from "vitest";

import { CombatSyncHandler } from "./CombatSyncHandler";

/** 呼び出し記録付きのハンドラを生成する */
const createHandler = () => {
  const calls: { name: string; payload: unknown }[] = [];

  const handler = new CombatSyncHandler({
    onRemoteBombPlaced: (payload) => {
      calls.push({ name: "onRemoteBombPlaced", payload });
    },
    onBombPlacementAcknowledged: (payload) => {
      calls.push({ name: "onBombPlacementAcknowledged", payload });
    },
    onRemotePlayerHit: (payload) => {
      calls.push({ name: "onRemotePlayerHit", payload });
    },
    onRemoteHurricaneHit: (payload) => {
      calls.push({ name: "onRemoteHurricaneHit", payload });
    },
  });

  return { handler, calls };
};

describe("CombatSyncHandler", () => {
  it("爆弾設置受信を爆弾設置コールバックへ転送すること", () => {
    const { handler, calls } = createHandler();
    const payload = {
      bombId: "b1",
      ownerTeamId: 1,
      x: 10,
      y: 20,
      explodeAtElapsedMs: 3000,
    };

    handler.handleReceivedBombPlaced(payload);

    expect(calls).toEqual([{ name: "onRemoteBombPlaced", payload }]);
  });

  it("爆弾設置受信のペイロード参照をそのまま渡すこと", () => {
    const { handler, calls } = createHandler();
    const payload = {
      bombId: "b1",
      ownerTeamId: 1,
      x: 10,
      y: 20,
      explodeAtElapsedMs: 3000,
    };

    handler.handleReceivedBombPlaced(payload);

    expect(calls[0].payload).toBe(payload);
  });

  it("爆弾設置ACK受信をACKコールバックへ転送すること", () => {
    const { handler, calls } = createHandler();
    const payload = { bombId: "b1", requestId: "r1" };

    handler.handleReceivedBombPlacedAck(payload);

    expect(calls).toEqual([{ name: "onBombPlacementAcknowledged", payload }]);
  });

  it("プレイヤー被弾受信を被弾コールバックへ転送すること", () => {
    const { handler, calls } = createHandler();
    const payload = { playerId: "p1" };

    handler.handleReceivedPlayerHit(payload);

    expect(calls).toEqual([{ name: "onRemotePlayerHit", payload }]);
  });

  it("ハリケーン被弾受信をハリケーン被弾コールバックへ転送すること", () => {
    const { handler, calls } = createHandler();
    const payload = { playerId: "p1" };

    handler.handleReceivedHurricaneHit(payload);

    expect(calls).toEqual([{ name: "onRemoteHurricaneHit", payload }]);
  });

  it("同じイベントを複数回受信した場合は都度転送すること", () => {
    const { handler, calls } = createHandler();

    handler.handleReceivedPlayerHit({ playerId: "p1" });
    handler.handleReceivedPlayerHit({ playerId: "p2" });

    expect(calls).toHaveLength(2);
  });

  it("メソッドを取り出して呼び出してもインスタンスへ束縛されていること", () => {
    const { handler, calls } = createHandler();
    const detached = handler.handleReceivedPlayerHit;

    detached({ playerId: "p1" });

    expect(calls).toEqual([
      { name: "onRemotePlayerHit", payload: { playerId: "p1" } },
    ]);
  });
});
