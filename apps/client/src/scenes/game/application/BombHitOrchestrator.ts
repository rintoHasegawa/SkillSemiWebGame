/**
 * BombHitOrchestrator
 * 爆弾爆発イベントと自プレイヤー情報から当たり判定を実行する
 * 自プレイヤーのみを判定対象とし，Bot被弾はサーバー側で処理する
 */
import { config } from "@client/config";
import { domain } from "@repo/shared";

const { checkBombHit } = domain.game.bombHit;
import type { BombExplodedPayload } from "@client/scenes/game/entities/bomb/BombManager";
import type { GamePlayers } from "./game.types";

/** 当たり判定オーケストレーターの初期化入力 */
type BombHitOrchestratorOptions = {
  players: GamePlayers;
  myId: string;
};

/** 爆弾爆発イベントの判定結果を表す型 */
export type BombHitEvaluationResult = {
  status: "duplicate" | "missing-local-player" | "no-hit" | "hit";
  hitPlayerId: string | null;
};

/** 爆弾当たり判定の実行順序を制御する */
export class BombHitOrchestrator {
  private readonly players: GamePlayers;
  private readonly myId: string;
  private handledBombIds = new Set<string>();

  constructor({ players, myId }: BombHitOrchestratorOptions) {
    this.players = players;
    this.myId = myId;
  }

  /** 爆弾爆発イベントを受けて自プレイヤーの当たり判定を実行し結果を返す */
  public handleBombExploded(payload: BombExplodedPayload): BombHitEvaluationResult {
    if (this.handledBombIds.has(payload.bombId)) {
      return { status: "duplicate", hitPlayerId: null };
    }

    this.handledBombIds.add(payload.bombId);
    const localCircle = this.getLocalPlayerCircle();
    if (!localCircle) {
      return { status: "missing-local-player", hitPlayerId: null };
    }

    const result = checkBombHit({
      bomb: {
        x: payload.x,
        y: payload.y,
        radius: payload.radius,
        teamId: payload.teamId,
      },
      player: localCircle,
    });

    if (!result.isHit) {
      return { status: "no-hit", hitPlayerId: null };
    }

    return { status: "hit", hitPlayerId: this.myId };
  }

  /** 判定済み状態を初期化する */
  public clear(): void {
    this.handledBombIds.clear();
  }

  /** 自プレイヤーの判定用円情報を取得する */
  private getLocalPlayerCircle() {
    const me = this.players[this.myId];
    if (!me) return null;

    const position = me.getPosition();
    const snapshot = me.getSnapshot();

    return {
      x: position.x,
      y: position.y,
      radius: config.GAME_CONFIG.PLAYER_RADIUS,
      teamId: snapshot.teamId,
    };
  }
}
