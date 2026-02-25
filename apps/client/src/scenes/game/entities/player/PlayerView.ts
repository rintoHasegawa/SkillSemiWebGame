/**
 * PlayerView
 * プレイヤーの描画責務を担うビュー
 * Pixi Spriteの生成と座標反映を行う
 */
import { Assets, Sprite, Texture } from "pixi.js";
import { config } from "@repo/shared";

export class PlayerView {
  public readonly displayObject: Sprite;

  constructor(teamId: number, isLocal: boolean) {
    const { PLAYER_RADIUS_PX } = config.GAME_CONFIG;

    // 🌟 1. チームIDと画像ファイル名の紐づけ（すべて .svg に変更しました！）
    const characterImages = [
      "/red.svg", // teamId: 0 のときの画像
      "/blue.svg", // teamId: 1 のときの画像
      "/green.svg", // teamId: 2 のときの画像
      "/yellow.svg", // teamId: 3 のときの画像
    ];

    // 配列から対応する画像ファイル名を取得（デフォルトは red.svg）
    const imageFileName = (characterImages[teamId] || "/red.svg").replace(/^\//, "");

    // 🌟 2. スプライト（画像）の生成（初期は1x1テクスチャ）
    this.displayObject = new Sprite(Texture.WHITE);

    // 🌟 3. 画像の基準点を「中心」にする（ズレ防止）
    this.displayObject.anchor.set(0.5);

    // 🌟 4. 画像サイズを当たり判定（半径×2）に合わせる
    this.displayObject.width = PLAYER_RADIUS_PX * 2;
    this.displayObject.height = PLAYER_RADIUS_PX * 2;

    // ローカルプレイヤーだけ少し視認性を上げる（未使用引数対策を兼ねる）
    this.displayObject.alpha = isLocal ? 1 : 0.95;

    // 非同期で画像テクスチャを読み込んで差し替える
    void this.applyTexture(imageFileName);
  }

  /** BASE_URL対応のURLで画像を読み込み、スプライトに反映する */
  private async applyTexture(imageFileName: string): Promise<void> {
    try {
      const imageUrl = `${import.meta.env.BASE_URL}${imageFileName}`;
      const texture = await Assets.load(imageUrl);
      this.displayObject.texture = texture;
    } catch (error) {
      console.error(`[PlayerView] 画像の読み込みに失敗: ${imageFileName}`, error);
    }
  }

  /** グリッド座標を描画座標へ反映する */
  public syncPosition(gridX: number, gridY: number): void {
    const { GRID_CELL_SIZE } = config.GAME_CONFIG;
    // マスの中心に配置されるように調整
    this.displayObject.x = gridX * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
    this.displayObject.y = gridY * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
  }

  /** 描画リソースを破棄する */
  public destroy(): void {
    this.displayObject.destroy();
  }
}
