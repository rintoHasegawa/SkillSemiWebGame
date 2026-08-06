/**
 * HurricaneSyncHandler.test
 * ハリケーン同期イベント適用の現行挙動を固定する characterization test
 * 生成・更新・置換・カリング・破棄の副作用を検証する
 */
import { Container, Sprite } from "pixi.js";
import { describe, expect, it } from "vitest";

import { config } from "@client/config";
import type { WorldViewport } from "@client/scenes/game/application/culling/worldViewport";
import { HurricaneSyncHandler } from "./HurricaneSyncHandler";

const CELL_SIZE = config.GAME_CONFIG.GRID_CELL_SIZE;

/** テスト対象のハンドラとワールドコンテナを生成する */
const createHandler = () => {
  const worldContainer = new Container();
  const handler = new HurricaneSyncHandler({ worldContainer });

  return { handler, worldContainer };
};

/** ハリケーン描画レイヤーを取得する */
const getLayer = (worldContainer: Container): Container => {
  return worldContainer.children[0] as Container;
};

/** ハリケーン描画オブジェクトを取得する */
const getDisplay = (worldContainer: Container, index = 0): Container => {
  return getLayer(worldContainer).children[index] as Container;
};

/** テスト用の可視矩形を生成する */
const createViewport = (overrides: Partial<WorldViewport> = {}): WorldViewport => {
  return { left: 0, top: 0, right: 1000, bottom: 1000, ...overrides };
};

describe("HurricaneSyncHandler", () => {
  it("初期化時にワールドへ描画レイヤーを追加すること", () => {
    const { worldContainer } = createHandler();

    expect(worldContainer.children).toHaveLength(1);
  });

  it("更新受信でハリケーン描画オブジェクトを生成すること", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([
      { id: "h1", x: 3, y: 4, radius: 2, rotationRad: 0.5 },
    ]);

    expect(getLayer(worldContainer).children).toHaveLength(1);
  });

  it("グリッド座標をピクセル座標へ変換して配置すること", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([
      { id: "h1", x: 3, y: 4, radius: 2, rotationRad: 0 },
    ]);

    const display = getDisplay(worldContainer);
    expect({ x: display.x, y: display.y }).toEqual({
      x: 3 * CELL_SIZE,
      y: 4 * CELL_SIZE,
    });
  });

  it("回転角をそのまま描画へ反映すること", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 1, rotationRad: 1.25 },
    ]);

    expect(getDisplay(worldContainer).rotation).toBe(1.25);
  });

  it("半径から直径ピクセルのスプライトサイズを設定すること", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 2, rotationRad: 0 },
    ]);

    const sprite = getDisplay(worldContainer).children[0] as Sprite;
    expect(sprite.width).toBe(2 * 2 * CELL_SIZE);
  });

  it("同じIDの更新では描画オブジェクトを増やさないこと", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 1, rotationRad: 0 },
    ]);
    handler.handleUpdateHurricanes([
      { id: "h1", x: 5, y: 6, radius: 1, rotationRad: 0 },
    ]);

    expect(getLayer(worldContainer).children).toHaveLength(1);
  });

  it("同じIDの更新で座標を更新すること", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 1, rotationRad: 0 },
    ]);
    handler.handleUpdateHurricanes([
      { id: "h1", x: 5, y: 6, radius: 1, rotationRad: 0 },
    ]);

    const display = getDisplay(worldContainer);
    expect({ x: display.x, y: display.y }).toEqual({
      x: 5 * CELL_SIZE,
      y: 6 * CELL_SIZE,
    });
  });

  it("複数のハリケーンを個別の描画オブジェクトとして扱うこと", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 1, rotationRad: 0 },
      { id: "h2", x: 1, y: 1, radius: 1, rotationRad: 0 },
    ]);

    expect(getLayer(worldContainer).children).toHaveLength(2);
  });

  it("空配列の更新受信では何も生成しないこと", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleUpdateHurricanes([]);

    expect(getLayer(worldContainer).children).toHaveLength(0);
  });

  it("全量受信で未含有IDの描画オブジェクトを除去すること", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 1, rotationRad: 0 },
      { id: "h2", x: 1, y: 1, radius: 1, rotationRad: 0 },
    ]);

    handler.handleCurrentHurricanes([
      { id: "h2", x: 2, y: 2, radius: 1, rotationRad: 0 },
    ]);

    expect(getLayer(worldContainer).children).toHaveLength(1);
  });

  it("全量受信で空配列を受け取った場合はすべて除去すること", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 1, rotationRad: 0 },
    ]);

    handler.handleCurrentHurricanes([]);

    expect(getLayer(worldContainer).children).toHaveLength(0);
  });

  it("全量受信で新規IDを生成すること", () => {
    const { handler, worldContainer } = createHandler();

    handler.handleCurrentHurricanes([
      { id: "h1", x: 1, y: 2, radius: 1, rotationRad: 0 },
    ]);

    expect(getLayer(worldContainer).children).toHaveLength(1);
  });

  it("可視矩形の外にあるハリケーンを非表示にすること", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 100, y: 100, radius: 1, rotationRad: 0 },
    ]);

    handler.applyViewportCulling(createViewport(), 0);

    expect(getDisplay(worldContainer).visible).toBe(false);
  });

  it("可視矩形の内にあるハリケーンを表示のままにすること", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 2, y: 2, radius: 1, rotationRad: 0 },
    ]);

    handler.applyViewportCulling(createViewport(), 0);

    expect(getDisplay(worldContainer).visible).toBe(true);
  });

  it("マージン分だけ可視判定を広げること", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 12, y: 5, radius: 1, rotationRad: 0 },
    ]);

    handler.applyViewportCulling(createViewport({ right: 1000 }), 200);

    expect(getDisplay(worldContainer).visible).toBe(true);
  });

  it("非表示中に受信した更新は描画へ反映しないこと", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 100, y: 100, radius: 1, rotationRad: 0 },
    ]);
    handler.applyViewportCulling(createViewport(), 0);

    handler.handleUpdateHurricanes([
      { id: "h1", x: 101, y: 100, radius: 1, rotationRad: 0 },
    ]);

    expect(getDisplay(worldContainer).x).toBe(100 * CELL_SIZE);
  });

  it("再表示時に最新状態を描画へ反映すること", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 100, y: 100, radius: 1, rotationRad: 0 },
    ]);
    handler.applyViewportCulling(createViewport(), 0);
    handler.handleUpdateHurricanes([
      { id: "h1", x: 2, y: 2, radius: 1, rotationRad: 0 },
    ]);

    handler.applyViewportCulling(createViewport(), 0);

    const display = getDisplay(worldContainer);
    expect({ visible: display.visible, x: display.x }).toEqual({
      visible: true,
      x: 2 * CELL_SIZE,
    });
  });

  it("破棄でワールドから描画レイヤーを取り除くこと", () => {
    const { handler, worldContainer } = createHandler();
    handler.handleUpdateHurricanes([
      { id: "h1", x: 0, y: 0, radius: 1, rotationRad: 0 },
    ]);

    handler.destroy();

    expect(worldContainer.children).toHaveLength(0);
  });

  it("メソッドを取り出して呼び出してもインスタンスへ束縛されていること", () => {
    const { handler, worldContainer } = createHandler();
    const detached = handler.handleUpdateHurricanes;

    detached([{ id: "h1", x: 0, y: 0, radius: 1, rotationRad: 0 }]);

    expect(getLayer(worldContainer).children).toHaveLength(1);
  });
});
