/**
 * BombHitOrchestrator
 * 爆弾爆発イベントとローカルプレイヤー情報を橋渡しして当たり判定を実行する
 * 判定結果を呼び出し元へ返して後続処理へ接続しやすくする
 */
import { checkBombHit } from "@client/scenes/game/entities/bomb/BombHitDetector";
import type { BombExplodedPayload } from "@client/scenes/game/entities/bomb/BombManager";
import { BombHitContextProvider } from "./BombHitContextProvider";

/** 当たり判定オーケストレーターの初期化入力 */
type BombHitOrchestratorOptions = {
  contextProvider: BombHitContextProvider;
};

/** 爆弾爆発イベントの判定結果を表す型 */
export type BombHitEvaluationResult = {
  status: "duplicate" | "missing-local-player" | "no-hit" | "hit";
  hitPlayerIds: string[];
};

/** 爆弾当たり判定の実行順序を制御する */
export class BombHitOrchestrator {
  private contextProvider: BombHitContextProvider;
  private handledBombIds = new Set<string>();

  constructor({ contextProvider }: BombHitOrchestratorOptions) {
    this.contextProvider = contextProvider;
  }

  /** 爆弾爆発イベントを受けて当たり判定を実行し結果を返す */
  public handleBombExploded(payload: BombExplodedPayload): BombHitEvaluationResult {
    if (this.handledBombIds.has(payload.bombId)) {
      return {
        status: "duplicate",
        hitPlayerIds: [],
      };
    }

    this.handledBombIds.add(payload.bombId);
    const localPlayer = this.contextProvider.getLocalPlayerCircle();
    if (!localPlayer) {
      return {
        status: "missing-local-player",
        hitPlayerIds: [],
      };
    }

    const reportablePlayers = this.contextProvider.getReportablePlayerCircles();
    const hitPlayerIds = reportablePlayers
      .filter((player) => {
        const result = checkBombHit({
          bomb: {
            x: payload.x,
            y: payload.y,
            radius: payload.radius,
            teamId: payload.teamId,
          },
          player,
        });

        return result.isHit;
      })
      .map((player) => player.playerId);

    if (hitPlayerIds.length === 0) {
      return {
        status: "no-hit",
        hitPlayerIds: [],
      };
    }

    return {
      status: "hit",
      hitPlayerIds,
    };

  }

  /** 判定済み状態を初期化する */
  public clear(): void {
    this.handledBombIds.clear();
  }
}
