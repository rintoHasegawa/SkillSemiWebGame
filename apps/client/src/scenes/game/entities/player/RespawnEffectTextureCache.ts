/**
 * RespawnEffectTextureCache
 * リスポーン演出テクスチャの共有キャッシュ
 * 複数の PlayerView インスタンスからの重複ロードを防ぐ
 */
import { Assets, Texture } from "pixi.js";

let texturePromise: Promise<Texture> | null = null;
let cachedTexture: Texture | null = null;

/** リスポーン演出テクスチャをキャッシュ経由で取得する */
export async function loadRespawnEffectTexture(
  imageUrl: string,
): Promise<Texture> {
  if (cachedTexture) return cachedTexture;

  if (!texturePromise) {
    texturePromise = Assets.load<Texture>(imageUrl);
  }

  cachedTexture = await texturePromise;
  return cachedTexture;
}
