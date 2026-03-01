/**
 * MapSyncHandler
 * マップ同期イベントの受信処理を担当する
 * セル更新データをマップへ適用する
 */
import type { domain } from "@repo/shared";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";

/** MapSyncHandler の初期化入力 */
export type MapSyncHandlerOptions = {
  gameMap: GameMapController;
};

/** マップ更新イベントの適用を担当する */
export class MapSyncHandler {
  private readonly gameMap: GameMapController;

  constructor({ gameMap }: MapSyncHandlerOptions) {
    this.gameMap = gameMap;
  }

  /** マップセル更新を適用する */
  public handleUpdateMapCells = (updates: domain.game.gridMap.CellUpdate[]): void => {
    this.gameMap.updateCells(updates);
  };
}