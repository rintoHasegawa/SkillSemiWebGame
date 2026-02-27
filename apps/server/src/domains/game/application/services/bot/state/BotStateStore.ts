/**
 * BotStateStore
 * Botごとの行動状態を保持し，取得と更新を提供する
 */
import type { BotControlPlayerId, BotState } from "../types/BotTypes.js";

/** Bot状態の保持と更新を提供するストア */
export class BotStateStore {
  private states = new Map<BotControlPlayerId, BotState>();

  public getOrCreate(
    botPlayerId: BotControlPlayerId,
    initialState: BotState,
  ): BotState {
    return this.states.get(botPlayerId) ?? initialState;
  }

  public set(botPlayerId: BotControlPlayerId, state: BotState): void {
    this.states.set(botPlayerId, state);
  }

  /** 既存状態がある場合のみ更新関数を適用する */
  public update(
    botPlayerId: BotControlPlayerId,
    updater: (state: BotState) => BotState,
  ): void {
    const current = this.states.get(botPlayerId);
    if (!current) {
      return;
    }

    this.states.set(botPlayerId, updater(current));
  }

  public clear(): void {
    this.states.clear();
  }
}
