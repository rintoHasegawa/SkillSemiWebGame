/**
 * BombHitOrchestrator
 * 爆弾爆発イベントとローカルプレイヤー情報を橋渡しして当たり判定を実行する
 * 同一爆弾の重複判定を抑止して当たり判定を実行する
 */
import { checkBombHit } from "@client/scenes/game/entities/bomb/BombHitDetector";
import type { BombExplodedPayload } from "@client/scenes/game/entities/bomb/BombManager";
import { BombHitContextProvider } from "./BombHitContextProvider";

/** 当たり判定オーケストレーターの初期化入力 */
type BombHitOrchestratorOptions = {
  contextProvider: BombHitContextProvider;
};

/** 爆弾当たり判定の実行順序を制御する */
export class BombHitOrchestrator {
  private contextProvider: BombHitContextProvider;
  private handledBombIds = new Set<string>();

  constructor({ contextProvider }: BombHitOrchestratorOptions) {
    this.contextProvider = contextProvider;
  }

  /** 爆弾爆発イベントを受けて当たり判定を実行する */
  public handleBombExploded(payload: BombExplodedPayload): void {
    if (this.handledBombIds.has(payload.bombId)) {
      return;
    }

    this.handledBombIds.add(payload.bombId);
    const localPlayer = this.contextProvider.getLocalPlayerCircle();
    if (!localPlayer) {
      return;
    }

    const result = checkBombHit({
      bomb: {
        x: payload.x,
        y: payload.y,
        radius: payload.radius,
        teamId: payload.teamId,
      },
      player: localPlayer,
    });

    if (!result.isHit) {
      return;
    }

  }

  /** 判定済み状態を初期化する */
  public clear(): void {
    this.handledBombIds.clear();
  }
}
