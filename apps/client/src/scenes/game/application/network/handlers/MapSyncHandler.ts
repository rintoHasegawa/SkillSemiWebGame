/**
 * MapSyncHandler
 * マップ同期イベントの受信処理を担当する
 * グループ化セル更新データを展開してマップへ適用する
 */
import type { UpdateMapCellsPayload } from "@repo/shared";
import { domain } from "@repo/shared";
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

  /** グループ化マップセル更新を展開して適用する */
  public handleUpdateMapCells = (grouped: UpdateMapCellsPayload): void => {
    const updates = domain.game.gridMap.ungroupCellUpdates(grouped);
    this.gameMap.updateCells(updates);
  };
}