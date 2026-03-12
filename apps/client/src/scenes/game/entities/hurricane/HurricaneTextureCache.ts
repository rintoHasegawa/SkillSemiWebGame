/**
 * HurricaneTextureCache
 * ハリケーン描画テクスチャの共有キャッシュ
 * 複数ハリケーン表示での重複ロードを防ぐ
 */
import { Assets, Texture } from "pixi.js";

let texturePromise: Promise<Texture> | null = null;
let cachedTexture: Texture | null = null;

/** ハリケーン描画テクスチャをキャッシュ経由で取得する */
export async function loadHurricaneTexture(imageUrl: string): Promise<Texture> {
  if (cachedTexture) return cachedTexture;

  if (!texturePromise) {
    texturePromise = Assets.load<Texture>(imageUrl);
  }

  cachedTexture = await texturePromise;
  return cachedTexture;
}
