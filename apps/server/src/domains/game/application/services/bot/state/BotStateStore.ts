/**
 * BotStateStore
 * Botごとの行動状態を保持し，取得と更新を提供する
 */
import type { BotPlayerId } from "../roster/BotRosterService.js";
import type { BotState } from "../types/BotTypes.js";

/** Bot状態の保持と更新を提供するストア */
export class BotStateStore {
  private states = new Map<BotPlayerId, BotState>();

  public getOrCreate(botPlayerId: BotPlayerId, initialState: BotState): BotState {
    return this.states.get(botPlayerId) ?? initialState;
  }

  public set(botPlayerId: BotPlayerId, state: BotState): void {
    this.states.set(botPlayerId, state);
  }

  public clear(): void {
    this.states.clear();
  }
}
