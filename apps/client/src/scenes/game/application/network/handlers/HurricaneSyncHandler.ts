/**
 * HurricaneSyncHandler
 * ハリケーン同期イベントの受信処理を担当する
 * 受信配列を描画コントローラーへ橋渡しする
 */
import { Container } from "pixi.js";
import type { UpdateHurricanesPayload } from "@repo/shared";
import { HurricaneOverlayController } from "@client/scenes/game/entities/hurricane/HurricaneOverlayController";

/** HurricaneSyncHandler の初期化入力 */
export type HurricaneSyncHandlerOptions = {
  worldContainer: Container;
};

/** ハリケーン同期イベントの適用を担当する */
export class HurricaneSyncHandler {
  private readonly overlayController: HurricaneOverlayController;

  constructor({ worldContainer }: HurricaneSyncHandlerOptions) {
    this.overlayController = new HurricaneOverlayController(worldContainer);
  }

  /** ハリケーン状態配列を描画へ反映する */
  public handleUpdateHurricanes = (payload: UpdateHurricanesPayload): void => {
    this.overlayController.applyUpdates(payload);
  };

  /** 管理中リソースを破棄する */
  public destroy(): void {
    this.overlayController.destroy();
  }
}
