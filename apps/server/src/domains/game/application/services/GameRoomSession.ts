/**
 * GameRoomSession
 * 1ルーム分のゲーム進行状態とゲームループ実行を管理する
 */
import { logEvent } from "@server/logging/logger";
import {
  gameDomainLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { config } from "@repo/shared";
import type { gameTypes, GameResultPayload } from "@repo/shared";
import { GameLoop } from "../../loop/GameLoop";
import { Player } from "../../entities/player/Player.js";
import { MapStore } from "../../entities/map/MapStore";
import { createSpawnedPlayer } from "../../entities/player/playerSpawn.js";
import {
  isValidPosition,
  setPlayerPosition,
} from "../../entities/player/playerMovement.js";

// 💡 追加: チーム割り当てサービスをインポート
import { TeamAssignmentService } from "../services/TeamAssignmentService.js";

const TEAM_NAMES = ["赤チーム", "青チーム", "緑チーム", "黄チーム"] as const;

/** ルーム単位のゲーム状態とループ進行を保持するセッションクラス */
export class GameRoomSession {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private gameLoop: GameLoop | null = null;
  private startTime: number | undefined;

  constructor(
    private roomId: string,
    playerIds: string[],
  ) {
    this.players = new Map();
    this.mapStore = new MapStore();

    playerIds.forEach((playerId) => {
      // 💡 追加: 現在の this.players (生成済みのプレイヤー達) を見て、一番人数の少ないチームを算出する
      const assignedTeamId = TeamAssignmentService.getBalancedTeamId(
        this.players,
      );

      // 💡 修正: バランス良く割り当てられたチームIDを渡してプレイヤーを生成する
      const player = createSpawnedPlayer(playerId, assignedTeamId);

      this.players.set(playerId, player);
    });
  }

  public start(
    tickRate: number,
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void,
  ): void {
    if (this.gameLoop) {
      return;
    }

    this.startTime = Date.now();
    this.gameLoop = new GameLoop(
      this.roomId,
      tickRate,
      this.players,
      this.mapStore,
      onTick,
      () => {
        const resultPayload = this.buildGameResultPayload();
        this.dispose();
        onGameEnd(resultPayload);
      },
    );

    this.gameLoop.start();
  }

  public movePlayer(id: string, x: number, y: number): void {
    const player = this.players.get(id);
    if (!player) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_PLAYER_NOT_FOUND,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    if (!isValidPosition(x, y)) {
      logEvent(logScopes.GAME_ROOM_SESSION, {
        event: gameDomainLogEvents.MOVE,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        roomId: this.roomId,
        socketId: id,
      });
      return;
    }

    setPlayerPosition(player, x, y);
  }

  public removePlayer(id: string): boolean {
    return this.players.delete(id);
  }

  public getStartTime(): number | undefined {
    return this.startTime;
  }

  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  public dispose(): void {
    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }
    this.players.clear();
  }

  private buildGameResultPayload(): GameResultPayload {
    const { TEAM_COUNT } = config.GAME_CONFIG;
    const gridColors = this.mapStore.getGridColorsSnapshot();
    const totalCells = gridColors.length;
    const paintedCounts = new Array<number>(TEAM_COUNT).fill(0);

    gridColors.forEach((teamId) => {
      if (!Number.isInteger(teamId) || teamId < 0 || teamId >= TEAM_COUNT) {
        return;
      }

      paintedCounts[teamId] += 1;
    });

    const rankings = paintedCounts
      .map((paintedCellCount, teamId) => ({
        rank: 0,
        teamId,
        teamName: TEAM_NAMES[teamId] ?? `チーム${teamId + 1}`,
        paintRate: totalCells > 0 ? (paintedCellCount / totalCells) * 100 : 0,
      }))
      .sort((a, b) => {
        if (b.paintRate !== a.paintRate) {
          return b.paintRate - a.paintRate;
        }

        return a.teamId - b.teamId;
      });

    let currentRank = 0;
    let previousPaintRate: number | null = null;
    const epsilon = 1e-9;

    rankings.forEach((item, index) => {
      if (previousPaintRate === null || Math.abs(item.paintRate - previousPaintRate) > epsilon) {
        currentRank = index + 1;
        previousPaintRate = item.paintRate;
      }

      item.rank = currentRank;
    });

    return { rankings };
  }
}
