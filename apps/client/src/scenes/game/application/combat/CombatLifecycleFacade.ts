/**
 * CombatLifecycleFacade
 * 被弾判定から硬直，演出，報告送信までの戦闘ライフサイクルを管理する
 * ゲームマネージャーから被弾関連の責務を分離する
 */
import { config } from "@client/config";
import type { PlayerHitPayload } from "@repo/shared";
import type { BombExplodedPayload } from "@client/scenes/game/entities/bomb/BombManager";
import { BombHitOrchestrator } from "@client/scenes/game/application/BombHitOrchestrator";
import { PlayerHitPolicy } from "@client/scenes/game/application/PlayerHitPolicy";
import { PlayerHitEffectOrchestrator } from "@client/scenes/game/application/PlayerHitEffectOrchestrator";
import { RespawnManager } from "./RespawnManager";
import type { GamePlayers } from "@client/scenes/game/application/game.types";

/** CombatLifecycleFacade の初期化入力 */
export type CombatLifecycleFacadeOptions = {
  players: GamePlayers;
  myId: string;
  acquireInputLock: () => () => void;
  onSendBombHitReport: (bombId: string) => void;
  onLocalBombHitCountChanged: (count: number) => void;
};

/** 被弾関連ライフサイクルの制御を担当する */
export class CombatLifecycleFacade {
  private readonly myId: string;
  private readonly onSendBombHitReport: (bombId: string) => void;
  private readonly onLocalBombHitCountChanged: (count: number) => void;
  private readonly bombHitOrchestrator: BombHitOrchestrator;
  private readonly playerHitPolicy: PlayerHitPolicy;
  private readonly playerHitEffectOrchestrator: PlayerHitEffectOrchestrator;
  private readonly respawnManager: RespawnManager;
  private localBombHitCount = 0;

  constructor({
    players,
    myId,
    acquireInputLock,
    onSendBombHitReport,
    onLocalBombHitCountChanged,
  }: CombatLifecycleFacadeOptions) {
    this.myId = myId;
    this.onSendBombHitReport = onSendBombHitReport;
    this.onLocalBombHitCountChanged = onLocalBombHitCountChanged;
    this.bombHitOrchestrator = new BombHitOrchestrator({
      players,
      myId,
    });
    this.playerHitPolicy = new PlayerHitPolicy({
      myId,
      hitStunMs: config.GAME_CONFIG.PLAYER_HIT_STUN_MS,
      acquireInputLock,
    });
    this.playerHitEffectOrchestrator = new PlayerHitEffectOrchestrator({
      players,
      blinkDurationMs: config.GAME_CONFIG.PLAYER_HIT_EFFECT.BLINK_DURATION_MS,
      dedupWindowMs: config.GAME_CONFIG.PLAYER_HIT_EFFECT.DEDUP_WINDOW_MS,
    });
    this.respawnManager = new RespawnManager({
      players,
      respawnStunMs: config.GAME_CONFIG.PLAYER_RESPAWN_STUN_MS,
      onRespawnComplete: (playerId) => {
        if (playerId !== this.myId) return;
        this.localBombHitCount = 0;
        this.onLocalBombHitCountChanged(this.localBombHitCount);
      },
    });
  }

  /** 爆弾爆発時の判定と後続処理を実行する */
  public handleBombExploded(payload: BombExplodedPayload): void {
    const hitPlayerId = this.bombHitOrchestrator.evaluateHit(payload);
    if (!hitPlayerId) return;
    if (this.respawnManager.isRespawning(this.myId)) return;

    const shouldStartRespawn = this.handleLocalBombHit();
    this.playerHitEffectOrchestrator.handleLocalBombHit(this.myId);

    if (shouldStartRespawn) {
      this.playerHitPolicy.applyLocalHitStun(
        config.GAME_CONFIG.PLAYER_RESPAWN_STUN_MS,
      );
      this.respawnManager.startSequence(this.myId);
    } else {
      this.playerHitPolicy.applyLocalHitStun();
    }
    this.onSendBombHitReport(payload.bombId);
  }

  /** ネットワーク被弾通知を適用する */
  public handleNetworkPlayerHit(payload: PlayerHitPayload): void {
    this.playerHitPolicy.applyPlayerHitEvent(payload);

    if (this.respawnManager.isRespawning(payload.playerId)) return;

    const hitCount = this.respawnManager.incrementHitCount(payload.playerId);
    this.playerHitEffectOrchestrator.handleNetworkPlayerHit(
      payload.playerId,
      this.myId,
    );

    if (hitCount >= config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT) {
      this.respawnManager.startSequence(payload.playerId);
    }
  }

  /** 管理中リソースを破棄する */
  public dispose(): void {
    this.bombHitOrchestrator.clear();
    this.playerHitPolicy.dispose();
    this.respawnManager.dispose();
  }

  /** ローカル被弾回数を返す */
  public getLocalBombHitCount(): number {
    return this.localBombHitCount;
  }

  private handleLocalBombHit(): boolean {
    this.localBombHitCount = this.respawnManager.incrementHitCount(this.myId);
    this.onLocalBombHitCountChanged(this.localBombHitCount);
    return (
      this.localBombHitCount >= config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT
    );
  }
}
