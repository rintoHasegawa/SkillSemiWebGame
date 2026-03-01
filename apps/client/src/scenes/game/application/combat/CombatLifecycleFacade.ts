/**
 * CombatLifecycleFacade
 * 被弾判定から硬直，演出，報告送信までの戦闘ライフサイクルを管理する
 * ゲームマネージャーから被弾関連の責務を分離する
 */
import { config } from "@client/config";
import type { PlayerDeadPayload } from "@repo/shared";
import type { BombExplodedPayload } from "@client/scenes/game/entities/bomb/BombManager";
import { BombHitOrchestrator } from "@client/scenes/game/application/BombHitOrchestrator";
import { PlayerDeathPolicy } from "@client/scenes/game/application/PlayerDeathPolicy";
import { PlayerHitEffectOrchestrator } from "@client/scenes/game/application/PlayerHitEffectOrchestrator";
import type { GamePlayers } from "@client/scenes/game/application/game.types";

/** CombatLifecycleFacade の初期化入力 */
export type CombatLifecycleFacadeOptions = {
  players: GamePlayers;
  myId: string;
  acquireInputLock: () => () => void;
  onSendBombHitReport: (bombId: string) => void;
};

/** 被弾関連ライフサイクルの制御を担当する */
export class CombatLifecycleFacade {
  private readonly myId: string;
  private readonly onSendBombHitReport: (
    bombId: string,
  ) => void;
  private readonly bombHitOrchestrator: BombHitOrchestrator;
  private readonly playerDeathPolicy: PlayerDeathPolicy;
  private readonly playerHitEffectOrchestrator: PlayerHitEffectOrchestrator;

  constructor({
    players,
    myId,
    acquireInputLock,
    onSendBombHitReport,
  }: CombatLifecycleFacadeOptions) {
    this.myId = myId;
    this.onSendBombHitReport = onSendBombHitReport;
    this.bombHitOrchestrator = new BombHitOrchestrator({
      players,
      myId,
    });
    this.playerDeathPolicy = new PlayerDeathPolicy({
      myId,
      hitStunMs: config.GAME_CONFIG.PLAYER_HIT_STUN_MS,
      acquireInputLock,
    });
    this.playerHitEffectOrchestrator = new PlayerHitEffectOrchestrator({
      players,
      blinkDurationMs: config.GAME_CONFIG.PLAYER_HIT_EFFECT.BLINK_DURATION_MS,
      dedupWindowMs: config.GAME_CONFIG.PLAYER_HIT_EFFECT.DEDUP_WINDOW_MS,
    });
  }

  /** 爆弾爆発時の判定と後続処理を実行する */
  public handleBombExploded(payload: BombExplodedPayload): void {
    const hitPlayerId = this.bombHitOrchestrator.evaluateHit(payload);
    if (!hitPlayerId) return;

    this.playerDeathPolicy.applyLocalHitStun();
    this.playerHitEffectOrchestrator.handleLocalBombHit(this.myId);
    this.onSendBombHitReport(payload.bombId);
  }

  /** ネットワーク被弾通知を適用する */
  public handleNetworkPlayerDead(payload: PlayerDeadPayload): void {
    this.playerDeathPolicy.applyPlayerDeadEvent(payload);
    this.playerHitEffectOrchestrator.handleNetworkPlayerDead(payload.playerId, this.myId);
  }

  /** 管理中リソースを破棄する */
  public dispose(): void {
    this.bombHitOrchestrator.clear();
    this.playerDeathPolicy.dispose();
  }
}