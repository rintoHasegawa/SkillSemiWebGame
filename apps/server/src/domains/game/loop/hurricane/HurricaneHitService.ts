/**
 * HurricaneHitService
 * ハリケーン被弾判定を担当する
 * ハリケーンは中立ハザードのためチーム比較を行わず円の重なりのみで判定する
 * 被弾クールダウンは壁時計ではなく単調増加のセッション経過時間で判定する
 */
import { config } from "@server/config";
import { domain } from "@repo/shared";
import { Player } from "../../entities/player/Player.js";
import type { HurricaneState } from "./hurricaneTypes.js";

const { checkCircleOverlap } = domain.game.collision;

/** ハリケーン被弾判定を実行する */
export class HurricaneHitService {
  /** プレイヤーごとの直近被弾時点（セッション経過ms） */
  private readonly lastHitAtElapsedMsByPlayerId = new Map<string, number>();

  /** クールダウン付きで被弾プレイヤーID配列を返す（時刻はセッション経過ms） */
  public collectHitPlayerIds(
    hurricanes: HurricaneState[],
    players: Map<string, Player>,
    elapsedMs: number,
  ): string[] {
    if (hurricanes.length === 0) {
      return [];
    }

    const hitPlayerIds: string[] = [];
    const hitCooldownMs = config.GAME_CONFIG.HURRICANE_HIT_COOLDOWN_MS;

    players.forEach((player) => {
      const lastHitAtElapsedMs = this.lastHitAtElapsedMsByPlayerId.get(
        player.id,
      );
      if (
        lastHitAtElapsedMs !== undefined &&
        elapsedMs - lastHitAtElapsedMs < hitCooldownMs
      ) {
        return;
      }

      if (!this.isOverlappingAnyHurricane(hurricanes, player)) {
        return;
      }

      this.lastHitAtElapsedMsByPlayerId.set(player.id, elapsedMs);
      hitPlayerIds.push(player.id);
    });

    return hitPlayerIds;
  }

  /** 被弾判定状態を初期化する */
  public clear(): void {
    this.lastHitAtElapsedMsByPlayerId.clear();
  }

  /** いずれかのハリケーンとプレイヤーの円が重なっているかを返す */
  private isOverlappingAnyHurricane(
    hurricanes: HurricaneState[],
    player: Player,
  ): boolean {
    // 中立ハザードのためチーム比較を行わず円の重なりのみで判定する
    const playerCircle = {
      x: player.x,
      y: player.y,
      radius: config.GAME_CONFIG.PLAYER_RADIUS,
    };

    return hurricanes.some(
      (hurricane) =>
        checkCircleOverlap({
          circleA: {
            x: hurricane.x,
            y: hurricane.y,
            radius: hurricane.radius,
          },
          circleB: playerCircle,
        }).isOverlapping,
    );
  }
}
