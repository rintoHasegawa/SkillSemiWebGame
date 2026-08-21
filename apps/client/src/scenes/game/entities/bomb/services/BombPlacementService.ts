/**
 * BombPlacementService
 * 爆弾設置要求の生成と描画ペイロード化を担う
 * クールダウン判定とチーム情報解決を提供する
 */
import { config } from "@client/config";
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import type { GamePlayers } from "@client/scenes/game/application/game.types";
import type { PlaceBombPayload } from "@repo/shared";
import { domain, config as sharedConfig } from "@repo/shared";
import { BombIdRegistry } from "@client/scenes/game/entities/bomb/BombIdRegistry";
import type { BombRenderPayload } from "@client/scenes/game/entities/bomb/runtime/BombRepository";

/** BombPlacementService の初期化入力 */
export type BombPlacementServiceOptions = {
  players: GamePlayers;
  myId: string;
  getElapsedMs: () => number;
  appearanceResolver: AppearanceResolver;
  bombIdRegistry: BombIdRegistry;
};

/** ローカル設置時の生成結果型 */
export type OwnBombPlacement = {
  tempBombId: string;
  payload: PlaceBombPayload;
  renderPayload: BombRenderPayload;
};

/** 爆弾設置要求の生成と描画情報変換を担う */
export class BombPlacementService {
  private readonly players: GamePlayers;
  private readonly myId: string;
  private readonly getElapsedMs: () => number;
  private readonly appearanceResolver: AppearanceResolver;
  private readonly bombIdRegistry: BombIdRegistry;
  private lastBombPlacedElapsedMs = Number.NEGATIVE_INFINITY;

  constructor({
    players,
    myId,
    getElapsedMs,
    appearanceResolver,
    bombIdRegistry,
  }: BombPlacementServiceOptions) {
    this.players = players;
    this.myId = myId;
    this.getElapsedMs = getElapsedMs;
    this.appearanceResolver = appearanceResolver;
    this.bombIdRegistry = bombIdRegistry;
  }

  /** 自プレイヤー位置に爆弾を仮IDで設置し，設置要求を返す */
  public placeOwnBomb(): OwnBombPlacement | null {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) {
      return null;
    }

    const elapsedMs = this.getElapsedMs();
    const { BOMB_FUSE_MS } = config.GAME_CONFIG;

    // Botと同じ共有ロジックでクールダウンを解決する
    const cooldownMs = domain.game.bomb.resolveBombCooldownMs(elapsedMs);

    if (elapsedMs - this.lastBombPlacedElapsedMs < cooldownMs) {
      return null;
    }

    const position = me.getPosition();
    const { requestId, tempBombId } =
      this.bombIdRegistry.issuePendingOwnBombId();
    const payload: PlaceBombPayload = {
      requestId,
      x: position.x,
      y: position.y,
      explodeAtElapsedMs: elapsedMs + BOMB_FUSE_MS,
    };
    const ownTeamId = this.resolveTeamIdBySocketId(this.myId);

    this.lastBombPlacedElapsedMs = elapsedMs;
    return {
      tempBombId,
      payload,
      renderPayload: this.toRenderPayload(payload, ownTeamId),
    };
  }

  /** 指定オーナー情報から描画ペイロードを生成する */
  public createRenderPayload(
    payload: {
      x: number;
      y: number;
      explodeAtElapsedMs: number;
      ownerTeamId: number;
    },
  ): BombRenderPayload {
    return this.toRenderPayload(payload, payload.ownerTeamId);
  }

  private toRenderPayload(
    payload: { x: number; y: number; explodeAtElapsedMs: number },
    teamId: number,
  ): BombRenderPayload {
    return {
      x: payload.x,
      y: payload.y,
      explodeAtElapsedMs: payload.explodeAtElapsedMs,
      radiusGrid: config.GAME_CONFIG.BOMB_RADIUS_GRID,
      teamId,
      color: this.appearanceResolver.resolveTeamColor(teamId),
    };
  }

  private resolveTeamIdBySocketId(socketId: string): number {
    const playerController = this.players[socketId];
    if (!playerController) {
      return sharedConfig.UNKNOWN_TEAM_ID;
    }

    return playerController.getSnapshot().teamId;
  }
}
