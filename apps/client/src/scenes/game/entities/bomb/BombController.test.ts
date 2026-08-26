/**
 * BombController.test
 * 状態に応じた導火線リングゲージの表示制御を検証する
 * armed 中のみゲージを描画し，exploded・finished では非表示にすることを検証する
 */
import { Assets } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@client/config";

import { BombController } from "./BombController";
import { BombView } from "./BombView";

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
    public arc(): void {}
    public moveTo(): void {}
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

const { BOMB_FUSE_MS } = config.GAME_CONFIG;
const EXPLODE_AT_MS = 5_000;
const PLACED_AT_MS = EXPLODE_AT_MS - BOMB_FUSE_MS;
const TEAM_COLOR = 0x4b4bff;
const bombTexture: Record<string, unknown> = { label: "bomb" };

const createController = (): BombController => {
  return new BombController({
    x: 2,
    y: 3,
    radiusGrid: 2,
    explodeAtElapsedMs: EXPLODE_AT_MS,
    teamId: 1,
    color: TEAM_COLOR,
  });
};

describe("BombController の導火線ゲージ表示", () => {
  beforeEach(() => {
    vi.mocked(Assets.load).mockResolvedValue(bombTexture);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("生成直後は残り比率1でゲージを描画すること", () => {
    const renderFuseGauge = vi.spyOn(BombView.prototype, "renderFuseGauge");

    createController();

    expect(renderFuseGauge).toHaveBeenCalledWith(1, TEAM_COLOR);
  });

  it("armed 中の render では経過msに応じた残り比率でゲージを描画すること", () => {
    const controller = createController();
    const renderFuseGauge = vi.spyOn(BombView.prototype, "renderFuseGauge");

    controller.updateState(PLACED_AT_MS + BOMB_FUSE_MS / 4);
    controller.render(PLACED_AT_MS + BOMB_FUSE_MS / 4);

    expect(renderFuseGauge).toHaveBeenCalledWith(0.75, TEAM_COLOR);
  });

  it("armed 中の render ではゲージを非表示にしないこと", () => {
    const controller = createController();
    const hideFuseGauge = vi.spyOn(BombView.prototype, "hideFuseGauge");

    controller.render(PLACED_AT_MS + BOMB_FUSE_MS / 2);

    expect(hideFuseGauge).not.toHaveBeenCalled();
  });

  it("exploded へ遷移した後の render ではゲージを非表示にすること", () => {
    const controller = createController();
    const hideFuseGauge = vi.spyOn(BombView.prototype, "hideFuseGauge");

    controller.updateState(EXPLODE_AT_MS);
    controller.render(EXPLODE_AT_MS);

    expect(controller.getState()).toBe("exploded");
    expect(hideFuseGauge).toHaveBeenCalledTimes(1);
  });

  it("exploded へ遷移した後の render ではゲージを描画しないこと", () => {
    const controller = createController();
    const renderFuseGauge = vi.spyOn(BombView.prototype, "renderFuseGauge");

    controller.updateState(EXPLODE_AT_MS);
    controller.render(EXPLODE_AT_MS);

    expect(renderFuseGauge).not.toHaveBeenCalled();
  });

  it("finished へ遷移した後の render ではゲージを描画しないこと", () => {
    const controller = createController();
    const renderFuseGauge = vi.spyOn(BombView.prototype, "renderFuseGauge");

    controller.updateState(EXPLODE_AT_MS);
    controller.updateState(EXPLODE_AT_MS + 1_000);
    controller.render(EXPLODE_AT_MS + 1_000);

    expect(controller.getState()).toBe("finished");
    expect(renderFuseGauge).not.toHaveBeenCalled();
  });
});
