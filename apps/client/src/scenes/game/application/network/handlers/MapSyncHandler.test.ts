/**
 * MapSyncHandler.test
 * マップ差分適用の現行挙動を固定する characterization test
 * セル更新配列の転送内容と空配列時の扱いを検証する
 */
import { describe, expect, it } from "vitest";

import type { domain } from "@repo/shared";

import type { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { MapSyncHandler } from "./MapSyncHandler";

/** 呼び出し記録付きのマップコントローラースタブを生成する */
const createGameMapStub = () => {
  const updateCellsCalls: domain.game.gridMap.CellUpdate[][] = [];

  const gameMap = {
    updateCells: (updates: domain.game.gridMap.CellUpdate[]) => {
      updateCellsCalls.push(updates);
    },
  } as unknown as GameMapController;

  return { gameMap, updateCellsCalls };
};

describe("MapSyncHandler", () => {
  it("セル更新をマップコントローラーへ転送すること", () => {
    const { gameMap, updateCellsCalls } = createGameMapStub();
    const handler = new MapSyncHandler({ gameMap });

    handler.handleUpdateMapCells([{ index: 3, teamId: 1 }]);

    expect(updateCellsCalls).toEqual([[{ index: 3, teamId: 1 }]]);
  });

  it("セル更新配列の参照をそのまま渡すこと", () => {
    const { gameMap, updateCellsCalls } = createGameMapStub();
    const handler = new MapSyncHandler({ gameMap });
    const updates = [{ index: 3, teamId: 1 }];

    handler.handleUpdateMapCells(updates);

    expect(updateCellsCalls[0]).toBe(updates);
  });

  it("空配列でもマップコントローラーを呼び出すこと", () => {
    const { gameMap, updateCellsCalls } = createGameMapStub();
    const handler = new MapSyncHandler({ gameMap });

    handler.handleUpdateMapCells([]);

    expect(updateCellsCalls).toEqual([[]]);
  });

  it("複数回受信した場合は都度転送すること", () => {
    const { gameMap, updateCellsCalls } = createGameMapStub();
    const handler = new MapSyncHandler({ gameMap });

    handler.handleUpdateMapCells([{ index: 1, teamId: 0 }]);
    handler.handleUpdateMapCells([{ index: 2, teamId: 2 }]);

    expect(updateCellsCalls).toHaveLength(2);
  });

  it("メソッドを取り出して呼び出してもインスタンスへ束縛されていること", () => {
    const { gameMap, updateCellsCalls } = createGameMapStub();
    const handler = new MapSyncHandler({ gameMap });
    const detached = handler.handleUpdateMapCells;

    detached([{ index: 5, teamId: 3 }]);

    expect(updateCellsCalls).toEqual([[{ index: 5, teamId: 3 }]]);
  });
});
