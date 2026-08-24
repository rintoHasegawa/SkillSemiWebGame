/**
 * BotTurnOrchestrator
 * Botの移動目標選択，移動計算，爆弾設置判断を統合して実行する
 */
import { domain } from "@repo/shared";
import { config } from "@server/config";
import type { Player } from "../../../../entities/player/Player";
import type { BotPlayerId } from "../roster/BotRosterService.js";
import { moveTowardsTarget } from "../movement/MovePlanner.js";
import { chooseNextTarget } from "../policies/TargetSelectionPolicy.js";
import { decideBombPlacement } from "../policies/BombPlacementPolicy.js";
import { BotHitStunPolicy } from "../combat/BotHitStunPolicy.js";
import { BotStateStore } from "../state/BotStateStore.js";
import type { BotDecision } from "../types/BotTypes.js";

type MapGridSize = {
  gridCols: number;
  gridRows: number;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/** Botの1tick分の意思決定を提供するオーケストレータ */
export class BotTurnOrchestrator {
  private readonly mapSize: MapGridSize;
  private stateStore = new BotStateStore();
  private readonly hitStunPolicy = new BotHitStunPolicy({
    hitStunMs: config.GAME_CONFIG.PLAYER_HIT_STUN_MS,
  });
  private readonly respawnAtMsByBotId = new Map<BotPlayerId, number>();
  // 硬直はBot状態の生成前にも適用されうるため状態とは別に保持する
  private readonly stunUntilMsByBotId = new Map<BotPlayerId, number>();

  constructor(mapSize: MapGridSize) {
    this.mapSize = mapSize;
  }

  public decide(
    botPlayerId: BotPlayerId,
    player: Player,
    gridColors: readonly number[],
    nowMs: number,
    elapsedMs: number,
  ): BotDecision {
    const currentCell = this.toMapCell(player.x, player.y);

    const currentState = this.stateStore.getOrCreate(botPlayerId, {
      targetCol: currentCell.col,
      targetRow: currentCell.row,
      lastBombPlacedAtMs: Number.NEGATIVE_INFINITY,
      bombSeq: 0,
    });

    // リスポーン時刻に達していたら初期位置へ座標をリセットする
    const respawnAtMs = this.respawnAtMsByBotId.get(botPlayerId);
    if (respawnAtMs !== undefined && nowMs >= respawnAtMs) {
      this.respawnAtMsByBotId.delete(botPlayerId);

      // 初期位置も移動時と同じ境界式でマップ範囲内へ収める
      const respawnPosition = domain.game.player.clampPositionToMapBounds(
        { x: player.initialX, y: player.initialY },
        this.mapSize,
      );
      const respawnCell = this.toMapCell(respawnPosition.x, respawnPosition.y);
      this.stateStore.update(botPlayerId, (state) => ({
        ...state,
        targetCol: respawnCell.col,
        targetRow: respawnCell.row,
      }));
      return {
        nextX: respawnPosition.x,
        nextY: respawnPosition.y,
        placeBombPayload: null,
      };
    }

    // 硬直中は状態を更新せず現在座標を維持する
    if (this.hitStunPolicy.isStunned(nowMs, this.getStunUntilMs(botPlayerId))) {
      return {
        nextX: player.x,
        nextY: player.y,
        placeBombPayload: null,
      };
    }

    const targetCenterX = currentState.targetCol + 0.5;
    const targetCenterY = currentState.targetRow + 0.5;
    const reachedTarget =
      Math.hypot(targetCenterX - player.x, targetCenterY - player.y) <=
      config.BOT_AI_CONFIG.TARGET_REACHED_EPSILON;

    const nextTarget = reachedTarget
      ? chooseNextTarget(
          currentCell.col,
          currentCell.row,
          gridColors,
          this.mapSize,
        )
      : { col: currentState.targetCol, row: currentState.targetRow };

    const moved = moveTowardsTarget(
      player.x,
      player.y,
      nextTarget.col,
      nextTarget.row,
      this.mapSize,
    );

    const bombDecision = decideBombPlacement(
      botPlayerId,
      nowMs,
      elapsedMs,
      currentState.lastBombPlacedAtMs,
      currentState.bombSeq,
      moved.nextX,
      moved.nextY,
    );

    this.stateStore.set(botPlayerId, {
      targetCol: nextTarget.col,
      targetRow: nextTarget.row,
      bombSeq: bombDecision.nextBombSeq,
      lastBombPlacedAtMs: bombDecision.nextLastBombPlacedAtMs,
    });

    return {
      nextX: moved.nextX,
      nextY: moved.nextY,
      placeBombPayload: bombDecision.placeBombPayload,
    };
  }

  /** 指定Botへ被弾硬直を適用する */
  public applyHitStun(botPlayerId: BotPlayerId, nowMs: number): void {
    this.stunUntilMsByBotId.set(
      botPlayerId,
      this.hitStunPolicy.calculateNextStunUntilMs(
        this.getStunUntilMs(botPlayerId),
        nowMs,
      ),
    );
  }

  /** 指定Botへリスポーン用硬直と位置リセットタイマーを適用する */
  public applyRespawnStun(botPlayerId: BotPlayerId, nowMs: number): void {
    const respawnStunMs = config.GAME_CONFIG.PLAYER_RESPAWN_STUN_MS;
    const respawnAtMs = nowMs + respawnStunMs;
    this.respawnAtMsByBotId.set(botPlayerId, respawnAtMs);
    this.stunUntilMsByBotId.set(
      botPlayerId,
      Math.max(this.getStunUntilMs(botPlayerId), respawnAtMs),
    );
  }

  /** warmUp時に初期目標を外部から上書きする */
  public overrideTarget(botPlayerId: BotPlayerId, col: number, row: number): void {
    this.stateStore.update(botPlayerId, (state) => ({
      ...state,
      targetCol: col,
      targetRow: row,
    }));
  }

  public clear(): void {
    this.stateStore.clear();
    this.respawnAtMsByBotId.clear();
    this.stunUntilMsByBotId.clear();
  }

  /** 指定Botの硬直終了時刻を返し，未適用なら硬直なしとして扱う */
  private getStunUntilMs(botPlayerId: BotPlayerId): number {
    return this.stunUntilMsByBotId.get(botPlayerId) ?? Number.NEGATIVE_INFINITY;
  }

  /** グリッド座標をマップ範囲内のセル添字へ変換する */
  private toMapCell(x: number, y: number): { col: number; row: number } {
    return {
      col: clamp(Math.floor(x), 0, this.mapSize.gridCols - 1),
      row: clamp(Math.floor(y), 0, this.mapSize.gridRows - 1),
    };
  }
}
