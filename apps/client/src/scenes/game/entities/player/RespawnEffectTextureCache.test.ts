/**
 * RespawnEffectTextureCache のテスト
 * ロード成功時のキャッシュ共有と，失敗時の再ロード可否を検証する
 */
import { Assets } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pixi.js", () => ({
  Assets: { load: vi.fn() },
}));

const IMAGE_URL = "/bakuhatueffe.svg";

const loadMock = vi.mocked(Assets.load);

const createTexture = (name: string): Record<string, unknown> => ({
  label: name,
});

describe("loadRespawnEffectTexture", () => {
  beforeEach(() => {
    vi.resetModules();
    loadMock.mockReset();
  });

  it("2回目以降はロードせずキャッシュしたテクスチャを返すこと", async () => {
    const texture = createTexture("respawnEffect");
    loadMock.mockResolvedValue(texture);
    const { loadRespawnEffectTexture } = await import("./RespawnEffectTextureCache");

    await expect(loadRespawnEffectTexture(IMAGE_URL)).resolves.toBe(texture);
    await expect(loadRespawnEffectTexture(IMAGE_URL)).resolves.toBe(texture);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("ロードに失敗した後の再呼び出しで再ロードして成功すること", async () => {
    const texture = createTexture("respawnEffect");
    loadMock.mockRejectedValueOnce(new Error("network error"));
    loadMock.mockResolvedValueOnce(texture);
    const { loadRespawnEffectTexture } = await import("./RespawnEffectTextureCache");

    await expect(loadRespawnEffectTexture(IMAGE_URL)).rejects.toThrow(
      "network error",
    );

    await expect(loadRespawnEffectTexture(IMAGE_URL)).resolves.toBe(texture);
    expect(loadMock).toHaveBeenCalledTimes(2);
  });
});
