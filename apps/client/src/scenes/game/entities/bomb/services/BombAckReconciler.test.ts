/**
 * BombAckReconciler.test
 * 爆弾設置ACK反映の現行挙動を固定する characterization test
 * 仮IDから正式IDへの置換と各種スキップ分岐を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { BombIdRegistry } from "@client/scenes/game/entities/bomb/BombIdRegistry";
import type {
  BombRenderPayload,
  BombRepository,
} from "@client/scenes/game/entities/bomb/runtime/BombRepository";
import { BombAckReconciler } from "./BombAckReconciler";

/** テスト用の描画ペイロードを生成する */
const createRenderPayload = (): BombRenderPayload => {
  return {
    x: 10,
    y: 20,
    explodeAtElapsedMs: 3000,
    radiusGrid: 2,
    teamId: 1,
    color: 0xff0000,
  };
};

/** 呼び出し記録付きの爆弾リポジトリスタブを生成する */
const createBombRepositoryStub = (
  renderPayloadById: Record<string, BombRenderPayload> = {},
) => {
  const removedBombIds: string[] = [];
  const upsertedBombs: { bombId: string; payload: BombRenderPayload }[] = [];

  const bombRepository = {
    getRenderPayload: (bombId: string) => renderPayloadById[bombId],
    removeBomb: (bombId: string) => {
      removedBombIds.push(bombId);
    },
    upsertBomb: (bombId: string, payload: BombRenderPayload) => {
      upsertedBombs.push({ bombId, payload });
    },
  } as unknown as BombRepository;

  return { bombRepository, removedBombIds, upsertedBombs };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BombAckReconciler", () => {
  it("未登録のrequestIdでは爆弾を差し替えないこと", () => {
    const { bombRepository, removedBombIds, upsertedBombs } =
      createBombRepositoryStub();
    const reconciler = new BombAckReconciler({
      bombIdRegistry: new BombIdRegistry(),
      bombRepository,
    });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId: "999" });

    expect({ removedBombIds, upsertedBombs }).toEqual({
      removedBombIds: [],
      upsertedBombs: [],
    });
  });

  it("仮IDの描画情報が無い場合でも仮IDの実体を破棄すること", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bombIdRegistry = new BombIdRegistry();
    const { requestId, tempBombId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository, removedBombIds } = createBombRepositoryStub();
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(removedBombIds).toEqual([tempBombId]);
  });

  it("仮IDの描画情報が無い場合は正式IDで再登録しないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bombIdRegistry = new BombIdRegistry();
    const { requestId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository, upsertedBombs } = createBombRepositoryStub();
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(upsertedBombs).toEqual([]);
  });

  it("仮IDの描画情報が無い場合はエラーログを出力すること", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bombIdRegistry = new BombIdRegistry();
    const { requestId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository } = createBombRepositoryStub();
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("仮IDの描画情報が無い場合でもpending対応は解除すること", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bombIdRegistry = new BombIdRegistry();
    const { requestId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository } = createBombRepositoryStub();
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(bombIdRegistry.resolveTempBombIdByRequestId(requestId)).toBeUndefined();
  });

  it("仮IDの爆弾を削除すること", () => {
    const bombIdRegistry = new BombIdRegistry();
    const { requestId, tempBombId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository, removedBombIds } = createBombRepositoryStub({
      [tempBombId]: createRenderPayload(),
    });
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(removedBombIds).toEqual([tempBombId]);
  });

  it("正式IDで同じ描画情報を再登録すること", () => {
    const bombIdRegistry = new BombIdRegistry();
    const { requestId, tempBombId } = bombIdRegistry.issuePendingOwnBombId();
    const renderPayload = createRenderPayload();
    const { bombRepository, upsertedBombs } = createBombRepositoryStub({
      [tempBombId]: renderPayload,
    });
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(upsertedBombs).toEqual([
      { bombId: "server-1", payload: renderPayload },
    ]);
  });

  it("差し替え後はpending対応を解除すること", () => {
    const bombIdRegistry = new BombIdRegistry();
    const { requestId, tempBombId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository } = createBombRepositoryStub({
      [tempBombId]: createRenderPayload(),
    });
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(bombIdRegistry.resolveTempBombIdByRequestId(requestId)).toBeUndefined();
  });

  it("正式IDが仮IDと同一の場合は差し替えないこと", () => {
    const bombIdRegistry = new BombIdRegistry();
    const { requestId, tempBombId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository, removedBombIds, upsertedBombs } =
      createBombRepositoryStub({ [tempBombId]: createRenderPayload() });
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: tempBombId, requestId });

    expect({ removedBombIds, upsertedBombs }).toEqual({
      removedBombIds: [],
      upsertedBombs: [],
    });
  });

  it("同じACKを二重受信しても二度目は差し替えないこと", () => {
    const bombIdRegistry = new BombIdRegistry();
    const { requestId, tempBombId } = bombIdRegistry.issuePendingOwnBombId();
    const { bombRepository, upsertedBombs } = createBombRepositoryStub({
      [tempBombId]: createRenderPayload(),
    });
    const reconciler = new BombAckReconciler({ bombIdRegistry, bombRepository });

    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });
    reconciler.applyPlacedBombAck({ bombId: "server-1", requestId });

    expect(upsertedBombs).toHaveLength(1);
  });
});
