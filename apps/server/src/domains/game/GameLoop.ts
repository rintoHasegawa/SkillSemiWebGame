import { Player } from "./entities/Player.js";
import { MapStore } from "./states/MapStore";
import { getGridIndexFromPosition } from "@repo/shared/src/domains/gridMap/gridMap.logic";
import type { CellUpdate } from "@repo/shared/src/domains/gridMap/gridMap.type";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

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
  private startTime: number = 0;

  constructor(
    private roomId: string,
    private tickRate: number,
    private playerIds: string[],
    private players: Map<string, Player>,
    private mapStore: MapStore,
    private onTick: (data: TickData) => void,
    private onGameEnd: () => void   // ゲーム終了時のコールバック
  ) {}

  start() {
    // 既にループが回っている場合は何もしない
    if (this.loopId) return;

    this.startTime = Date.now();

    this.loopId = setInterval(() => {
      // 時間経過のチェック
      const elapsedTimeMs = Date.now() - this.startTime;
      if (elapsedTimeMs >= GAME_CONFIG.GAME_DURATION_SEC * 1000) {
        // ゲーム終了時にループを止めて終了処理へ
        this.stop();
        this.onGameEnd();
        return; // 今回のフレームの座標更新はスキップ
      }

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