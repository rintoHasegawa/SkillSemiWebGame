/**
 * RespawnManager
 * プレイヤーのリスポーンシーケンスと被弾カウントを管理する
 * CombatLifecycleFacade からリスポーン責務を分離する
 */
import type { GamePlayers } from "@client/scenes/game/application/game.types";

/** RespawnManager の初期化入力 */
export type RespawnManagerOptions = {
  players: GamePlayers;
  respawnStunMs: number;
  onRespawnComplete: (playerId: string) => void;
};

/** リスポーンシーケンスと被弾カウントを管理する */
export class RespawnManager {
  private readonly players: GamePlayers;
  private readonly respawnStunMs: number;
  private readonly onRespawnComplete: (playerId: string) => void;
  private readonly hitCountByPlayerId = new Map<string, number>();
  private readonly respawnTimersByPlayerId = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor({
    players,
    respawnStunMs,
    onRespawnComplete,
  }: RespawnManagerOptions) {
    this.players = players;
    this.respawnStunMs = respawnStunMs;
    this.onRespawnComplete = onRespawnComplete;
  }

  /** リスポーン待機中かどうかを返す */
  public isRespawning(playerId: string): boolean {
    return this.respawnTimersByPlayerId.has(playerId);
  }

  /** 被弾カウントを1増加して現在値を返す */
  public incrementHitCount(playerId: string): number {
    const nextCount = (this.hitCountByPlayerId.get(playerId) ?? 0) + 1;
    this.hitCountByPlayerId.set(playerId, nextCount);
    return nextCount;
  }

  /**
   * リスポーンシーケンスを開始する
   * すでにリスポーン中の場合は何もしない
   */
  public startSequence(playerId: string): void {
    if (this.isRespawning(playerId)) return;

    const target = this.players[playerId];
    if (target) {
      target.setRespawnEffectVisible(true);
    }

    const timerId = setTimeout(() => {
      this.respawnTimersByPlayerId.delete(playerId);

      const player = this.players[playerId];
      if (player) {
        player.respawnToInitialPosition();
        player.setRespawnEffectVisible(false);
      }

      this.hitCountByPlayerId.set(playerId, 0);
      this.onRespawnComplete(playerId);
    }, this.respawnStunMs);

    this.respawnTimersByPlayerId.set(playerId, timerId);
  }

  /** 管理中リソースを破棄する */
  public dispose(): void {
    this.respawnTimersByPlayerId.forEach((timerId) => clearTimeout(timerId));
    this.respawnTimersByPlayerId.clear();
  }
}
