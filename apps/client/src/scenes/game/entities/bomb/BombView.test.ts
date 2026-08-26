/**
 * BombView のテスト
 * 爆弾テクスチャ共有キャッシュのロード成功時の共有と，失敗時の再ロード可否を検証する
 * 併せて残り時間リングゲージの描画・非表示の振る舞いを検証する
 */
import { Assets } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@client/config";

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
    // 描画呼び出しの順序を検証できるよう引数付きで記録する
    public readonly calls: { method: string; args: unknown[] }[] = [];

    public clear(): void {
      this.calls.push({ method: "clear", args: [] });
    }

    public circle(...args: unknown[]): void {
      this.calls.push({ method: "circle", args });
    }

    public arc(...args: unknown[]): void {
      this.calls.push({ method: "arc", args });
    }

    public moveTo(...args: unknown[]): void {
      this.calls.push({ method: "moveTo", args });
    }

    public fill(...args: unknown[]): void {
      this.calls.push({ method: "fill", args });
    }

    public stroke(...args: unknown[]): void {
      this.calls.push({ method: "stroke", args });
    }
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

type FakeDrawCall = { method: string; args: unknown[] };

// displayObject の子は 爆風円 → ゲージ → フォールバック → スプライト の順で追加される
const getFuseGaugeGraphic = (
  view: { displayObject: { children: unknown[] } },
): { visible: boolean; calls: FakeDrawCall[] } => {
  const graphic = view.displayObject.children[1];
  return graphic as { visible: boolean; calls: FakeDrawCall[] };
};

const findArcCall = (calls: FakeDrawCall[]): FakeDrawCall | undefined => {
  return calls.find((call) => call.method === "arc");
};

const GAUGE_RADIUS_PX = config.GAME_CONFIG.BOMB_FUSE_GAUGE_RADIUS_PX;
const GAUGE_START_ANGLE = -Math.PI / 2;

describe("BombView.renderFuseGauge", () => {
  beforeEach(async () => {
    vi.resetModules();
    loadMock.mockReset();
    loadMock.mockResolvedValue(createTexture("bomb"));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("残り比率1のとき12時起点から時計回りに全周の弧を描くこと", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(1, 0xff4b4b);

    expect(findArcCall(getFuseGaugeGraphic(view).calls)?.args).toEqual([
      0,
      0,
      GAUGE_RADIUS_PX,
      GAUGE_START_ANGLE,
      GAUGE_START_ANGLE + Math.PI * 2,
    ]);
  });

  it("残り比率0.5のとき消費ぶんを時計回りに詰めた半周の弧を描くこと", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(0.5, 0xff4b4b);

    // 残弧の始端が起点から時計回りへ半周進み，終端は起点（一周後）に固定される
    expect(findArcCall(getFuseGaugeGraphic(view).calls)?.args).toEqual([
      0,
      0,
      GAUGE_RADIUS_PX,
      GAUGE_START_ANGLE + Math.PI,
      GAUGE_START_ANGLE + Math.PI * 2,
    ]);
  });

  it("残り比率が減るほど弧の始端が時計回りに進むこと", async () => {
    const { BombView } = await import("./BombView");
    // fake Graphics は呼び出しを累積するため，比率ごとにビューを分ける
    const earlierView = new BombView();
    const laterView = new BombView();

    earlierView.renderFuseGauge(0.75, 0xff4b4b);
    const earlierStartAngle = findArcCall(getFuseGaugeGraphic(earlierView).calls)
      ?.args[3] as number;

    laterView.renderFuseGauge(0.25, 0xff4b4b);
    const laterStartAngle = findArcCall(getFuseGaugeGraphic(laterView).calls)
      ?.args[3] as number;

    expect(laterStartAngle).toBeGreaterThan(earlierStartAngle);
  });

  it("残り比率0のとき弧を描かないこと", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(0, 0xff4b4b);

    expect(findArcCall(getFuseGaugeGraphic(view).calls)).toBeUndefined();
  });

  it("残り比率0でも全周のトラックは描くこと", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(0, 0xff4b4b);

    const circleCall = getFuseGaugeGraphic(view).calls.find(
      (call) => call.method === "circle",
    );
    expect(circleCall?.args).toEqual([0, 0, GAUGE_RADIUS_PX]);
  });

  it("トラックを黒の半透明で描くこと", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();
    const { TRACK_COLOR, TRACK_ALPHA } = config.GAME_CONFIG.BOMB_FUSE_GAUGE;

    view.renderFuseGauge(1, 0xff4b4b);

    const trackStroke = getFuseGaugeGraphic(view).calls.find(
      (call) => call.method === "stroke",
    );
    expect(trackStroke?.args[0]).toMatchObject({
      color: TRACK_COLOR,
      alpha: TRACK_ALPHA,
    });
  });

  it("負の残り比率が渡されても弧を描かないこと", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(-0.5, 0xff4b4b);

    expect(findArcCall(getFuseGaugeGraphic(view).calls)).toBeUndefined();
  });

  it("残り比率が1を超えても全周までにクランプすること", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(1.5, 0xff4b4b);

    expect(findArcCall(getFuseGaugeGraphic(view).calls)?.args[4]).toBe(
      GAUGE_START_ANGLE + Math.PI * 2,
    );
  });

  it("チーム色の弧を白の縁取りより後に重ねて描くこと", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();
    const teamColor = 0x4b4bff;
    const { OUTLINE_COLOR } = config.GAME_CONFIG.BOMB_FUSE_GAUGE;

    view.renderFuseGauge(1, teamColor);

    const strokeColors = getFuseGaugeGraphic(view)
      .calls.filter((call) => call.method === "stroke")
      .map((call) => (call.args[0] as { color: number }).color);
    expect(strokeColors.slice(-2)).toEqual([OUTLINE_COLOR, teamColor]);
  });

  it("描画するとゲージが表示状態になること", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(1, 0xff4b4b);

    expect(getFuseGaugeGraphic(view).visible).toBe(true);
  });

  it("生成直後はゲージが非表示であること", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    expect(getFuseGaugeGraphic(view).visible).toBe(false);
  });
});

describe("BombView.hideFuseGauge", () => {
  beforeEach(() => {
    vi.resetModules();
    loadMock.mockReset();
    loadMock.mockResolvedValue(createTexture("bomb"));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("ゲージを非表示にすること", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(1, 0xff4b4b);
    view.hideFuseGauge();

    expect(getFuseGaugeGraphic(view).visible).toBe(false);
  });

  it("非表示にするとき描画内容を消去すること", async () => {
    const { BombView } = await import("./BombView");
    const view = new BombView();

    view.renderFuseGauge(1, 0xff4b4b);
    view.hideFuseGauge();

    expect(getFuseGaugeGraphic(view).calls.at(-1)?.method).toBe("clear");
  });
});
