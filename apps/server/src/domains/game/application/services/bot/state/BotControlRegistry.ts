/**
 * BotControlRegistry
 * Bot制御対象プレイヤーIDの判定と管理を担う
 */
import { isBotPlayerId } from "../roster/BotRosterService.js";
import type { BotControlPlayerId } from "../types/BotTypes.js";

/** Bot制御対象プレイヤーID集合を管理するストア */
export class BotControlRegistry {
  private disconnectedPlayerIds = new Set<BotControlPlayerId>();

  /** 指定プレイヤーがBot制御対象かを判定する */
  public isBotControlled(playerId: string): boolean {
    return (
      isBotPlayerId(playerId) ||
      this.disconnectedPlayerIds.has(playerId)
    );
  }

  /** 切断プレイヤーをBot制御対象へ追加する */
  public promoteDisconnectedPlayer(playerId: BotControlPlayerId): void {
    this.disconnectedPlayerIds.add(playerId);
  }

  /** プレイヤーをBot制御対象から除外する */
  public releasePlayer(playerId: BotControlPlayerId): void {
    this.disconnectedPlayerIds.delete(playerId);
  }

  /** 管理中のBot制御対象を全て破棄する */
  public clear(): void {
    this.disconnectedPlayerIds.clear();
  }
}
