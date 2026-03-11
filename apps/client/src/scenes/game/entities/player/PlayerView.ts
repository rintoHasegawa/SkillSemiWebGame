/**
 * PlayerView
 * プレイヤーの描画責務を担うビュー
 * Pixi Spriteの生成と座標反映を行う
 */
import { Assets, Sprite, Texture } from "pixi.js";
import { config } from "@client/config";
import { Container, Text, TextStyle } from "pixi.js";
import { loadRespawnEffectTexture } from "./RespawnEffectTextureCache";

const ENABLE_DEBUG_LOG = import.meta.env.DEV;

export class PlayerView {
  public readonly displayObject: Container;
  private readonly respawnEffectSprite: Sprite;
  private readonly sprite: Sprite;
  private readonly nameText: Text;

  constructor(imageFileName: string, playerName: string, isLocal: boolean) {
    const { PLAYER_RADIUS_PX, PLAYER_RENDER_SCALE } = config.GAME_CONFIG;

    this.displayObject = new Container();

    this.respawnEffectSprite = new Sprite(Texture.WHITE);
    this.respawnEffectSprite.anchor.set(0.5, 0.5);
    this.respawnEffectSprite.visible = false;
    this.applyRespawnEffectSize();

    // 🌟 2. スプライト（画像）の生成（初期は1x1テクスチャ）
    this.sprite = new Sprite(Texture.WHITE);

    // 🌟 3. 画像の基準点を「中心」にする（ズレ防止）
    this.sprite.anchor.set(0.5, 0.5);

    // 🌟 4. 画像サイズを当たり判定（半径×2）に合わせる
    this.sprite.width = PLAYER_RADIUS_PX * 2 * PLAYER_RENDER_SCALE;
    this.sprite.height = PLAYER_RADIUS_PX * 2 * PLAYER_RENDER_SCALE;

    // ローカルプレイヤーだけ少し視認性を上げる（未使用引数対策を兼ねる）
    this.sprite.alpha = isLocal ? 1 : 0.95;

    this.nameText = new Text({
      text: playerName,
      style: new TextStyle({
        fill: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        stroke: { color: "#000000", width: 3 },
      }),
    });
    this.nameText.anchor.set(0.5, 0);
    this.nameText.y = PLAYER_RADIUS_PX * PLAYER_RENDER_SCALE + 8;

    this.displayObject.addChild(
      this.respawnEffectSprite,
      this.sprite,
      this.nameText,
    );

    // 非同期で画像テクスチャを読み込んで差し替える
    void this.applyTexture(imageFileName);
    void this.applyRespawnEffectTexture();
  }

  /** リスポーン演出画像を読み込んで背面スプライトへ反映する */
  private async applyRespawnEffectTexture(): Promise<void> {
    try {
      const imageUrl = `${import.meta.env.BASE_URL}bakuhatueffe.svg`;
      const texture = await loadRespawnEffectTexture(imageUrl);
      this.respawnEffectSprite.texture = texture;
      this.applyRespawnEffectSize();
    } catch (error) {
      console.error("[PlayerView] bakuhatueffe.svg の読み込みに失敗", error);
    }
  }

  /** リスポーン演出スプライトに設定サイズを適用する */
  private applyRespawnEffectSize(): void {
    const size = config.GAME_CONFIG.PLAYER_RESPAWN_EFFECT_SIZE_PX;
    this.respawnEffectSprite.width = size;
    this.respawnEffectSprite.height = size;
  }

  /** BASE_URL対応のURLで画像を読み込み、スプライトに反映する */
  private async applyTexture(imageFileName: string): Promise<void> {
    try {
      const imageUrl = `${import.meta.env.BASE_URL}${imageFileName}`;
      const texture = await Assets.load(imageUrl);
      this.sprite.texture = texture;

      const { PLAYER_RADIUS_PX, PLAYER_RENDER_SCALE } = config.GAME_CONFIG;

      this.sprite.width = PLAYER_RADIUS_PX * 2 * PLAYER_RENDER_SCALE;
      this.sprite.height = PLAYER_RADIUS_PX * 2 * PLAYER_RENDER_SCALE;
      this.nameText.y = PLAYER_RADIUS_PX * PLAYER_RENDER_SCALE + 8;

      if (ENABLE_DEBUG_LOG) {
        console.log(
          `[PlayerView] 画像を ${PLAYER_RENDER_SCALE} 倍のサイズ（${this.displayObject.width}）に拡大`,
        );
      }
    } catch (error) {
      console.error(
        `[PlayerView] 画像の読み込みに失敗: ${imageFileName}`,
        error,
      );
    }
  }

  /** リスポーン演出の表示状態を更新する */
  public setRespawnEffectVisible(visible: boolean): void {
    this.respawnEffectSprite.visible = visible;
  }

  /** グリッド座標を描画座標へ反映する */
  public syncPosition(gridX: number, gridY: number): void {
    const { GRID_CELL_SIZE } = config.GAME_CONFIG;
    this.displayObject.x = gridX * GRID_CELL_SIZE;
    this.displayObject.y = gridY * GRID_CELL_SIZE;
  }

  /** 描画リソースを破棄する */
  public destroy(): void {
    this.displayObject.destroy({ children: true });
  }
}
