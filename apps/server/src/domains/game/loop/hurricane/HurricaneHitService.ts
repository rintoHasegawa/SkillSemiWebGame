/**
 * HurricaneHitService
 * ハリケーン被弾判定を担当する
 */
import { config } from "@server/config";
import { domain } from "@repo/shared";
import { Player } from "../../entities/player/Player.js";
import type { HurricaneState } from "./hurricaneTypes.js";

const { checkBombHit } = domain.game.bombHit;

/** ハリケーン被弾判定を実行する */
export class HurricaneHitService {
  private readonly lastHitAtMsByPlayerId = new Map<string, number>();

  /** クールダウン付きで被弾プレイヤーID配列を返す */
  public collectHitPlayerIds(
    hurricanes: HurricaneState[],
    players: Map<string, Player>,
    nowMs: number,
  ): string[] {
    if (hurricanes.length === 0) {
      return [];
    }

    const hitPlayerIds: string[] = [];
    const hitCooldownMs = config.GAME_CONFIG.HURRICANE_HIT_COOLDOWN_MS;

    players.forEach((player) => {
      const lastHitAtMs = this.lastHitAtMsByPlayerId.get(player.id);
      if (lastHitAtMs !== undefined && nowMs - lastHitAtMs < hitCooldownMs) {
        return;
      }

      const isHit = hurricanes.some((hurricane) => {
        const result = checkBombHit({
          bomb: {
            x: hurricane.x,
            y: hurricane.y,
            radius: hurricane.radius,
            teamId: -1,
          },
          player: {
            x: player.x,
            y: player.y,
            radius: config.GAME_CONFIG.PLAYER_RADIUS,
            teamId: player.teamId,
          },
        });

        return result.isHit;
      });

      if (!isHit) {
        return;
      }

      this.lastHitAtMsByPlayerId.set(player.id, nowMs);
      hitPlayerIds.push(player.id);
    });

    return hitPlayerIds;
  }

  /** 被弾判定状態を初期化する */
  public clear(): void {
    this.lastHitAtMsByPlayerId.clear();
  }
}
