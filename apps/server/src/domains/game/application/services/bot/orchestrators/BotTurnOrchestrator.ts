/**
 * BotTurnOrchestrator
 * Botの移動目標選択，移動計算，爆弾設置判断を統合して実行する
 */
import { config } from "@server/config";
import type { Player } from "../../../../entities/player/Player";
import { moveTowardsTarget } from "../movement/MovePlanner.js";
import { chooseNextTarget } from "../policies/TargetSelectionPolicy.js";
import { decideBombPlacement } from "../policies/BombPlacementPolicy.js";
import { BotHitStunPolicy } from "../combat/BotHitStunPolicy.js";
import { BotStateStore } from "../state/BotStateStore.js";
import type { BotControlPlayerId, BotDecision } from "../types/BotTypes.js";

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/** Botの1tick分の意思決定を提供するオーケストレータ */
export class BotTurnOrchestrator {
  private stateStore = new BotStateStore();
  private readonly hitStunPolicy = new BotHitStunPolicy({
    hitStunMs: config.GAME_CONFIG.PLAYER_HIT_STUN_MS,
  });

  public decide(
    botPlayerId: BotControlPlayerId,
    player: Player,
    gridColors: number[],
    nowMs: number,
    elapsedMs: number,
  ): BotDecision {
    const { GRID_COLS, GRID_ROWS } = config.GAME_CONFIG;
    const currentCol = clamp(Math.floor(player.x), 0, GRID_COLS - 1);
    const currentRow = clamp(Math.floor(player.y), 0, GRID_ROWS - 1);

    const currentState = this.stateStore.getOrCreate(botPlayerId, {
      targetCol: currentCol,
      targetRow: currentRow,
      lastBombPlacedAtMs: Number.NEGATIVE_INFINITY,
      bombSeq: 0,
      stunUntilMs: Number.NEGATIVE_INFINITY,
    });

    if (this.hitStunPolicy.isStunned(nowMs, currentState.stunUntilMs)) {
      this.stateStore.set(botPlayerId, {
        ...currentState,
      });

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
      ? chooseNextTarget(currentCol, currentRow, gridColors)
      : { col: currentState.targetCol, row: currentState.targetRow };

    const moved = moveTowardsTarget(
      player.x,
      player.y,
      nextTarget.col,
      nextTarget.row,
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
      stunUntilMs: currentState.stunUntilMs,
    });

    return {
      nextX: moved.nextX,
      nextY: moved.nextY,
      placeBombPayload: bombDecision.placeBombPayload,
    };
  }

  /** 指定Botへ被弾硬直を適用する */
  public applyHitStun(botPlayerId: BotControlPlayerId, nowMs: number): void {
    this.stateStore.update(botPlayerId, (state) => {
      return {
        ...state,
        stunUntilMs: this.hitStunPolicy.calculateNextStunUntilMs(
          state.stunUntilMs,
          nowMs,
        ),
      };
    });
  }

  public clear(): void {
    this.stateStore.clear();
  }
}
