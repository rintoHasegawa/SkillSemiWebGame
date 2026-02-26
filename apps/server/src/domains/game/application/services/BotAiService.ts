/**
 * BotAiService
 * Botの移動・爆弾行動を決定する
 */
import type { PlaceBombPayload } from "@repo/shared";
import { config } from "@server/config";
import { isBotPlayerId } from "./BotRosterService";
import type { Player } from "../../entities/player/Player";

type BotState = {
  targetCol: number;
  targetRow: number;
  lastBombPlacedAtMs: number;
  bombSeq: number;
};

type BotDecision = {
  nextX: number;
  nextY: number;
  placeBombPayload: PlaceBombPayload | null;
};

const UNPAINTED_TEAM_ID = -1;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const toGridIndex = (col: number, row: number, cols: number): number => {
  return row * cols + col;
};

const getCellTeamId = (
  gridColors: number[],
  col: number,
  row: number,
  cols: number,
): number => {
  return gridColors[toGridIndex(col, row, cols)] ?? UNPAINTED_TEAM_ID;
};

const chooseNextTarget = (
  col: number,
  row: number,
  gridColors: number[],
): { col: number; row: number } => {
  const { UNPAINTED_PRIORITY_STRENGTH } = config.BOT_AI_CONFIG;
  const { GRID_COLS, GRID_ROWS } = config.GAME_CONFIG;
  const candidates = [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ].filter((candidate) => {
    return (
      candidate.col >= 0 &&
      candidate.col < GRID_COLS &&
      candidate.row >= 0 &&
      candidate.row < GRID_ROWS
    );
  });

  if (candidates.length === 0) {
    return { col, row };
  }

  const unpaintedCandidates = candidates.filter((candidate) => {
    return (
      getCellTeamId(gridColors, candidate.col, candidate.row, GRID_COLS) ===
      UNPAINTED_TEAM_ID
    );
  });

  if (
    unpaintedCandidates.length > 0 &&
    Math.random() < clamp(UNPAINTED_PRIORITY_STRENGTH, 0, 1)
  ) {
    return (
      unpaintedCandidates[
        Math.floor(Math.random() * unpaintedCandidates.length)
      ] ?? { col, row }
    );
  }

  return (
    candidates[Math.floor(Math.random() * candidates.length)] ?? { col, row }
  );
};

const moveTowardsTarget = (
  x: number,
  y: number,
  targetCol: number,
  targetRow: number,
): { nextX: number; nextY: number } => {
  const targetX = targetCol + 0.5;
  const targetY = targetRow + 0.5;
  const diffX = targetX - x;
  const diffY = targetY - y;
  const distance = Math.hypot(diffX, diffY);

  const maxStep =
    config.GAME_CONFIG.PLAYER_SPEED *
    (config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS / 1000) *
    clamp(config.BOT_AI_CONFIG.MOVE_SMOOTHNESS, 0.1, 2);

  if (distance <= maxStep || distance === 0) {
    return { nextX: targetX, nextY: targetY };
  }

  const ratio = maxStep / distance;
  const nextX = x + diffX * ratio;
  const nextY = y + diffY * ratio;

  return {
    nextX: clamp(nextX, 0, config.GAME_CONFIG.GRID_COLS - 0.001),
    nextY: clamp(nextY, 0, config.GAME_CONFIG.GRID_ROWS - 0.001),
  };
};

/** Botの移動・爆弾行動を管理するサービス */
export class BotAiService {
  private states = new Map<string, BotState>();

  public decide(
    player: Player,
    gridColors: number[],
    nowMs: number,
    elapsedMs: number,
  ): BotDecision {
    const { GRID_COLS, GRID_ROWS, BOMB_COOLDOWN_MS, BOMB_FUSE_MS } =
      config.GAME_CONFIG;
    const currentCol = clamp(Math.floor(player.x), 0, GRID_COLS - 1);
    const currentRow = clamp(Math.floor(player.y), 0, GRID_ROWS - 1);

    const currentState = this.states.get(player.id) ?? {
      targetCol: currentCol,
      targetRow: currentRow,
      lastBombPlacedAtMs: Number.NEGATIVE_INFINITY,
      bombSeq: 0,
    };

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

    let placeBombPayload: PlaceBombPayload | null = null;
    const canPlaceBomb =
      nowMs - currentState.lastBombPlacedAtMs >= BOMB_COOLDOWN_MS;
    if (
      canPlaceBomb &&
      Math.random() <
        clamp(config.BOT_AI_CONFIG.BOMB_PLACE_PROBABILITY_PER_TICK, 0, 1)
    ) {
      const nextBombSeq = currentState.bombSeq + 1;
      placeBombPayload = {
        requestId: `bot-${player.id}-${nextBombSeq}`,
        x: moved.nextX,
        y: moved.nextY,
        explodeAtElapsedMs: elapsedMs + BOMB_FUSE_MS,
      };

      this.states.set(player.id, {
        targetCol: nextTarget.col,
        targetRow: nextTarget.row,
        bombSeq: nextBombSeq,
        lastBombPlacedAtMs: nowMs,
      });

      return {
        nextX: moved.nextX,
        nextY: moved.nextY,
        placeBombPayload,
      };
    }

    this.states.set(player.id, {
      targetCol: nextTarget.col,
      targetRow: nextTarget.row,
      bombSeq: currentState.bombSeq,
      lastBombPlacedAtMs: currentState.lastBombPlacedAtMs,
    });

    return {
      nextX: moved.nextX,
      nextY: moved.nextY,
      placeBombPayload,
    };
  }

  public clear(): void {
    this.states.clear();
  }
}

export { isBotPlayerId };
