/**
 * BombView のテスト
 * 爆弾テクスチャ共有キャッシュのロード成功時の共有と，失敗時の再ロード可否を検証する
 */
import { Assets } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pixi.js", () => {
  class FakeContainer {
    public zIndex = 0;
    public x = 0;
    public y = 0;
    public visible = true;
    public destroyed = false;
    public readonly children: FakeContainer[] = [];

    public addChild(child: FakeContainer): void {
      this.children.push(child);
    }

    public destroy(): void {
      this.destroyed = true;
    }
  }

  class FakeGraphics extends FakeContainer {
    public clear(): void {}
    public circle(): void {}
    public fill(): void {}
    public stroke(): void {}
  }

  class FakeSprite extends FakeContainer {
    public texture: unknown;
    public tint = 0xffffff;
    public alpha = 1;
    public width = 0;
    public height = 0;
    public readonly anchor = { set: (): void => {} };

    public constructor(texture: unknown) {
      super();
      this.texture = texture;
    }
  }

  return {
    Container: FakeContainer,
    Graphics: FakeGraphics,
    Sprite: FakeSprite,
    Texture: { WHITE: { label: "white" } },
    Assets: { load: vi.fn() },
  };
});

const loadMock = vi.mocked(Assets.load);

const createTexture = (name: string): Record<string, unknown> => ({
  label: name,
});

// displayObject へ最後に追加される子が爆弾スプライトである
const getBombSprite = (
  view: { displayObject: { children: unknown[] } },
): { visible: boolean; texture: unknown } => {
  const sprite = view.displayObject.children.at(-1);
  return sprite as { visible: boolean; texture: unknown };
};

describe("BombView のテクスチャキャッシュ", () => {
  beforeEach(() => {
    vi.resetModules();
    loadMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("2体目以降はロードせずキャッシュしたテクスチャを共有すること", async () => {
    const texture = createTexture("bomb");
    loadMock.mockResolvedValue(texture);
    const { BombView } = await import("./BombView");

    const firstView = new BombView();
    const secondView = new BombView();
    await vi.waitFor(() => {
      expect(getBombSprite(secondView).texture).toBe(texture);
    });

    expect(getBombSprite(firstView).texture).toBe(texture);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("ロードに失敗した後に生成した爆弾はテクスチャを再ロードして描画できること", async () => {
    const texture = createTexture("bomb");
    loadMock.mockRejectedValueOnce(new Error("network error"));
    loadMock.mockResolvedValueOnce(texture);
    const { BombView } = await import("./BombView");

    const failedView = new BombView();
    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
    failedView.renderState("armed", 3, 0xff0000);
    expect(getBombSprite(failedView).visible).toBe(false);

    const retriedView = new BombView();
    await vi.waitFor(() => {
      expect(getBombSprite(retriedView).texture).toBe(texture);
    });
    retriedView.renderState("armed", 3, 0xff0000);

    expect(getBombSprite(retriedView).visible).toBe(true);
    expect(loadMock).toHaveBeenCalledTimes(2);
  });
});
