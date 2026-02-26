/**
 * PlayerHitEffectOrchestrator
 * 被弾時のプレイヤー演出発火を管理する
 * ローカル被弾とネットワーク通知被弾を同じ窓口で扱う
 */
import type { GamePlayers } from "./game.types";

type PlayerHitEffectOrchestratorOptions = {
  players: GamePlayers;
  blinkDurationMs: number;
};

/** 被弾演出の発火責務を管理するオーケストレーター */
export class PlayerHitEffectOrchestrator {
  private readonly players: GamePlayers;
  private readonly blinkDurationMs: number;

  constructor({ players, blinkDurationMs }: PlayerHitEffectOrchestratorOptions) {
    this.players = players;
    this.blinkDurationMs = blinkDurationMs;
  }

  /** ローカル被弾時の点滅演出を発火する */
  public handleLocalBombHit(localPlayerId: string): void {
    this.playBombHitBlink(localPlayerId);
  }

  /** ネットワーク通知の被弾時に必要な点滅演出を発火する */
  public handleNetworkPlayerDead(playerId: string, localPlayerId: string): void {
    if (playerId === localPlayerId) {
      return;
    }

    this.playBombHitBlink(playerId);
  }

  /** 指定プレイヤーへ被弾点滅演出を適用する */
  private playBombHitBlink(playerId: string): void {
    const target = this.players[playerId];
    if (!target) {
      return;
    }

    target.playBombHitBlink(this.blinkDurationMs);
  }
}