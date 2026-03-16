/**
 * HurricaneSyncHandler
 * ハリケーン同期イベントの受信処理を担当する
 * 受信配列を描画コントローラーへ橋渡しする
 */
import { Container } from "pixi.js";
import type {
  CurrentHurricanesPayload,
  UpdateHurricanesPayload,
} from "@repo/shared";
import { HurricaneOverlayController } from "@client/scenes/game/entities/hurricane/HurricaneOverlayController";
import type { WorldViewport } from "@client/scenes/game/application/culling/worldViewport";

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

  /** current-hurricanes を描画へ置換反映する */
  public handleCurrentHurricanes = (
    payload: CurrentHurricanesPayload,
  ): void => {
    this.overlayController.replaceAll(payload);
  };

  /** ハリケーン状態配列を描画へ反映する */
  public handleUpdateHurricanes = (payload: UpdateHurricanesPayload): void => {
    this.overlayController.applyUpdates(payload);
  };

  /** 可視矩形に基づいてハリケーン表示を切り替える */
  public applyViewportCulling(viewport: WorldViewport, marginPx: number): void {
    this.overlayController.applyViewportCulling(viewport, marginPx);
  }

  /** 管理中リソースを破棄する */
  public destroy(): void {
    this.overlayController.destroy();
  }
}
