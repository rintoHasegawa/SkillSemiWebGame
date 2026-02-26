/**
 * PlayerHitEffectOrchestrator
 * 被弾時のプレイヤー演出発火を管理する
 * ローカル被弾とネットワーク通知被弾を同じ窓口で扱う
 */
import type { GamePlayers } from "./game.types";

type PlayerHitEffectOrchestratorOptions = {
  players: GamePlayers;
  blinkDurationMs: number;
  dedupWindowMs: number;
  nowMsProvider?: () => number;
};

/** 被弾演出イベント名を表す型 */
type PlayerHitEffectEventName = "local-bomb-hit" | "network-player-dead";

/** 被弾演出イベント入力を表す型 */
type PlayerHitEffectEvent = {
  name: PlayerHitEffectEventName;
  playerId: string;
  localPlayerId: string;
};

/** 被弾演出の発火責務を管理するオーケストレーター */
export class PlayerHitEffectOrchestrator {
  private readonly players: GamePlayers;
  private readonly blinkDurationMs: number;
  private readonly dedupWindowMs: number;
  private readonly nowMsProvider: () => number;
  private readonly lastTriggeredAtByPlayerId = new Map<string, number>();

  constructor({
    players,
    blinkDurationMs,
    dedupWindowMs,
    nowMsProvider = () => performance.now(),
  }: PlayerHitEffectOrchestratorOptions) {
    this.players = players;
    this.blinkDurationMs = blinkDurationMs;
    this.dedupWindowMs = dedupWindowMs;
    this.nowMsProvider = nowMsProvider;
  }

  /** ローカル被弾時の点滅演出を発火する */
  public handleLocalBombHit(localPlayerId: string): void {
    this.dispatch({
      name: "local-bomb-hit",
      playerId: localPlayerId,
      localPlayerId,
    });
  }

  /** ネットワーク通知の被弾時に必要な点滅演出を発火する */
  public handleNetworkPlayerDead(playerId: string, localPlayerId: string): void {
    this.dispatch({
      name: "network-player-dead",
      playerId,
      localPlayerId,
    });
  }

  /** 被弾演出イベント名に応じて処理を分岐する */
  public dispatch(event: PlayerHitEffectEvent): void {
    if (event.name === "network-player-dead" && event.playerId === event.localPlayerId) {
      return;
    }

    if (!this.shouldTrigger(event.playerId)) {
      return;
    }

    this.playBombHitBlink(event.playerId);
  }

  /** 指定プレイヤーへ被弾点滅演出を適用する */
  private playBombHitBlink(playerId: string): void {
    const target = this.players[playerId];
    if (!target) {
      return;
    }

    target.playBombHitBlink(this.blinkDurationMs);
  }

  /** 同一プレイヤーへの短時間重複発火を抑止する */
  private shouldTrigger(playerId: string): boolean {
    const nowMs = this.nowMsProvider();
    const lastTriggeredAt = this.lastTriggeredAtByPlayerId.get(playerId);
    if (lastTriggeredAt !== undefined && nowMs - lastTriggeredAt < this.dedupWindowMs) {
      return false;
    }

    this.lastTriggeredAtByPlayerId.set(playerId, nowMs);
    return true;
  }
}