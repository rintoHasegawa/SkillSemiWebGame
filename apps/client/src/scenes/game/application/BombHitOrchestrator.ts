/**
 * BombHitOrchestrator
 * 爆弾爆発イベントとローカルプレイヤー情報を橋渡しして当たり判定を実行する
 * 自プレイヤーのみを判定対象とし，Bot被弾はサーバー側で処理する
 */
import { domain } from "@repo/shared";

const { checkBombHit } = domain.game.bombHit;
import type { BombExplodedPayload } from "@client/scenes/game/entities/bomb/BombManager";
import { BombHitContextProvider } from "./BombHitContextProvider";

/** 当たり判定オーケストレーターの初期化入力 */
type BombHitOrchestratorOptions = {
  contextProvider: BombHitContextProvider;
};

/** 爆弾爆発イベントの判定結果を表す型 */
export type BombHitEvaluationResult = {
  status: "duplicate" | "missing-local-player" | "no-hit" | "hit";
  hitPlayerId: string | null;
};

/** 爆弾当たり判定の実行順序を制御する */
export class BombHitOrchestrator {
  private contextProvider: BombHitContextProvider;
  private handledBombIds = new Set<string>();

  constructor({ contextProvider }: BombHitOrchestratorOptions) {
    this.contextProvider = contextProvider;
  }

  /** 爆弾爆発イベントを受けて自プレイヤーの当たり判定を実行し結果を返す */
  public handleBombExploded(payload: BombExplodedPayload): BombHitEvaluationResult {
    if (this.handledBombIds.has(payload.bombId)) {
      return { status: "duplicate", hitPlayerId: null };
    }

    this.handledBombIds.add(payload.bombId);
    const localPlayer = this.contextProvider.getLocalReportableCircle();
    if (!localPlayer) {
      return { status: "missing-local-player", hitPlayerId: null };
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
      return { status: "no-hit", hitPlayerId: null };
    }

    return { status: "hit", hitPlayerId: localPlayer.playerId };
  }

  /** 判定済み状態を初期化する */
  public clear(): void {
    this.handledBombIds.clear();
  }
}
