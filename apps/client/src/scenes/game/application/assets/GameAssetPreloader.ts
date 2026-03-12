/**
 * GameAssetPreloader
 * ゲーム開始前に必要な画像アセットの先読みを集約する
 * 開始直後の描画負荷スパイクを抑える
 */
import { loadHurricaneTexture } from "@client/scenes/game/entities/hurricane/HurricaneTextureCache";
import { loadRespawnEffectTexture } from "@client/scenes/game/entities/player/RespawnEffectTextureCache";

/** ゲーム開始前に必要なアセットを先読みする */
export const preloadGameStartAssets = (): void => {
  void loadRespawnEffectTexture(`${import.meta.env.BASE_URL}bakuhatueffe.svg`);
  void loadHurricaneTexture(`${import.meta.env.BASE_URL}hurricane.svg`);
};
