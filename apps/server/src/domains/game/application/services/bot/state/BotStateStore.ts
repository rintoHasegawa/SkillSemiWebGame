/**
 * BotStateStore
 * Botごとの行動状態を保持し，取得と更新を提供する
 */
import type { BotPlayerId } from "../roster/BotRosterService.js";
import type { BotState } from "../types/BotTypes.js";

/** Bot状態の保持と更新を提供するストア */
export class BotStateStore {
  private states = new Map<BotPlayerId, BotState>();

  /**
   * 既存状態を返し，未生成の場合は初期状態を保存して返す
   * 生成直後から update() の対象にし，状態未保存による取りこぼしを防ぐ
   */
  public getOrCreate(botPlayerId: BotPlayerId, initialState: BotState): BotState {
    const current = this.states.get(botPlayerId);
    if (current) {
      return current;
    }

    this.states.set(botPlayerId, initialState);
    return initialState;
  }

  public set(botPlayerId: BotPlayerId, state: BotState): void {
    this.states.set(botPlayerId, state);
  }

  /** 既存状態がある場合のみ更新関数を適用する */
  public update(
    botPlayerId: BotPlayerId,
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
