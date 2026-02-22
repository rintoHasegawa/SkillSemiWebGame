import { Player } from "./entities/Player.js";
import { MapStore } from "./states/MapStore";
import { getGridIndexFromPosition } from "@repo/shared/src/domains/gridMap/gridMap.logic";
import type { CellUpdate } from "@repo/shared/src/domains/gridMap/gridMap.type";

// コールバックで渡すデータの型定義
export interface TickData {
  players: {
    id: string;
    x: number;
    y: number;
    teamId: number;
  }[];
  cellUpdates: CellUpdate[];
}

export class GameLoop {
  private loopId: NodeJS.Timeout | null = null;

  constructor(
    private roomId: string,
    private tickRate: number,
    private playerIds: string[],
    private players: Map<string, Player>,
    private mapStore: MapStore,
    private onTick: (data: TickData) => void
  ) {}

  start() {
    // 既にループが回っている場合は何もしない
    if (this.loopId) return;

    this.loopId = setInterval(() => {
      const playersData: TickData["players"] = [];

      // 1. 各プレイヤーの座標処理とマス塗りの判定
      this.playerIds.forEach(id => {
        const player = this.players.get(id);
        if (!player) return;

        const gridIndex = getGridIndexFromPosition(player.x, player.y);
        if (gridIndex !== null) {
          this.mapStore.paintCell(gridIndex, player.teamId);
        }

        // 送信用のプレイヤーデータを構築
        playersData.push({
          id: player.id,
          x: player.x,
          y: player.y,
          teamId: player.teamId,
        });
      });

      // 2. マスの差分（Diff）を取得
      const cellUpdates = this.mapStore.getAndClearUpdates();

      // 3. 通信層（GameHandler）へデータを渡す
      this.onTick({
        players: playersData,
        cellUpdates: cellUpdates,
      });
      
    }, this.tickRate);

    console.log(`[GameLoop] Started for room: ${this.roomId} at ${this.tickRate}ms`);
  }

  stop() {
    if (this.loopId) {
      clearInterval(this.loopId);
      this.loopId = null;
      console.log(`[GameLoop] Stopped for room: ${this.roomId}`);
    }
  }
}