/**
 * BombManager
 * 爆弾エンティティの生成，更新，破棄を管理する
 * クールダウンと設置位置解決をまとめて扱う
 */
import type { Container } from "pixi.js";
import { config } from "@client/config";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  PlaceBombPayload,
} from "@repo/shared";
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { BombController } from "./BombController";
import type { GamePlayers } from "@client/scenes/game/application/game.types";

/** 経過時間ミリ秒を返す関数型 */
export type ElapsedMsProvider = () => number;

/** 爆弾の描画更新に使う入力データ型 */
export type BombRenderPayload = {
  x: number;
  y: number;
  explodeAtElapsedMs: number;
  radiusGrid: number;
  teamId: number;
};

/** 爆弾設置時に返す結果型 */
export type BombPlacementResult = {
  tempBombId: string;
  payload: PlaceBombPayload;
};

type BombManagerOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getElapsedMs: ElapsedMsProvider;
};

/** 爆弾エンティティのライフサイクルを管理する */
export class BombManager {
  private static readonly UNKNOWN_TEAM_ID = -1;

  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private getElapsedMs: ElapsedMsProvider;
  private bombs = new Map<string, BombController>();
  private bombRenderPayloadById = new Map<string, BombRenderPayload>();
  private pendingOwnRequestToTempBombId = new Map<string, string>();
  private pendingTempBombIdToOwnRequest = new Map<string, string>();
  private lastBombPlacedElapsedMs = Number.NEGATIVE_INFINITY;
  private requestSerial = 0;

  constructor({ worldContainer, players, myId, getElapsedMs }: BombManagerOptions) {
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.getElapsedMs = getElapsedMs;
  }

  /** 自プレイヤー位置に爆弾を仮IDで設置し，設置要求を返す */
  public placeBomb(): BombPlacementResult | null {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) return null;

    const elapsedMs = this.getElapsedMs();
    const { BOMB_COOLDOWN_MS, BOMB_FUSE_MS } = config.GAME_CONFIG;
    if (elapsedMs - this.lastBombPlacedElapsedMs < BOMB_COOLDOWN_MS) {
      return null;
    }

    const position = me.getPosition();
    const requestId = this.createRequestId(elapsedMs);
    const payload: PlaceBombPayload = {
      requestId,
      x: position.x,
      y: position.y,
      explodeAtElapsedMs: elapsedMs + BOMB_FUSE_MS,
    };
    const tempBombId = this.createTempBombId(requestId);
    const ownTeamId = this.resolveTeamIdBySocketId(this.myId);

    this.pendingOwnRequestToTempBombId.set(requestId, tempBombId);
    this.pendingTempBombIdToOwnRequest.set(tempBombId, requestId);
    this.upsertBomb(tempBombId, this.toRenderPayload(payload, ownTeamId));
    this.lastBombPlacedElapsedMs = elapsedMs;
    return {
      tempBombId,
      payload,
    };
  }

  /** 他プレイヤー向けの爆弾確定イベントを反映する */
  public applyPlacedBombFromOthers(payload: BombPlacedPayload): void {
    const ownerTeamId = this.resolveTeamIdBySocketId(payload.ownerSocketId);
    this.upsertBomb(payload.bombId, this.toRenderPayload(payload, ownerTeamId));
  }

  /** 設置者本人向けACKを反映し，仮IDから正式IDへ置換する */
  public applyPlacedBombAck(payload: BombPlacedAckPayload): void {
    const tempBombId = this.pendingOwnRequestToTempBombId.get(payload.requestId);
    if (!tempBombId) {
      return;
    }

    const tempPayload = this.bombRenderPayloadById.get(tempBombId);
    this.removePendingRequestByRequestId(payload.requestId);
    if (!tempPayload || tempBombId === payload.bombId) {
      return;
    }

    this.removeBomb(tempBombId);
    this.upsertBomb(payload.bombId, tempPayload);
  }

  /** 描画ペイロードで指定IDの爆弾を追加または更新する */
  public upsertBomb(bombId: string, payload: BombRenderPayload): void {
    const previousPayload = this.bombRenderPayloadById.get(bombId);
    if (previousPayload && this.isSameRenderPayload(previousPayload, payload)) {
      return;
    }

    const current = this.bombs.get(bombId);
    if (current) {
      this.worldContainer.removeChild(current.getDisplayObject());
      current.destroy();
    }

    const bomb = new BombController(payload);
    this.bombs.set(bombId, bomb);
    this.bombRenderPayloadById.set(bombId, payload);
    this.worldContainer.addChild(bomb.getDisplayObject());
  }

  /** 指定IDの爆弾を削除する */
  public removeBomb(bombId: string): void {
    const bomb = this.bombs.get(bombId);
    if (!bomb) return;

    this.worldContainer.removeChild(bomb.getDisplayObject());
    bomb.destroy();
    this.bombs.delete(bombId);
    this.bombRenderPayloadById.delete(bombId);
    this.removePendingRequestByTempBombId(bombId);
  }

  /** 爆弾状態を更新し終了済みを破棄する */
  public tick(): void {
    const elapsedMs = this.getElapsedMs();

    this.bombs.forEach((bomb, bombId) => {
      bomb.tick(elapsedMs);

      if (bomb.isFinished()) {
        this.removeBomb(bombId);
        return;
      }
    });
  }

  /** 管理中の爆弾をすべて破棄する */
  public destroy(): void {
    this.bombs.forEach((bomb) => bomb.destroy());
    this.bombs.clear();
    this.bombRenderPayloadById.clear();
    this.pendingOwnRequestToTempBombId.clear();
    this.pendingTempBombIdToOwnRequest.clear();
  }

  private isSameRenderPayload(a: BombRenderPayload, b: BombRenderPayload): boolean {
    return a.x === b.x
      && a.y === b.y
      && a.explodeAtElapsedMs === b.explodeAtElapsedMs
      && a.radiusGrid === b.radiusGrid
      && a.teamId === b.teamId;
  }

  private toRenderPayload(
    payload: { x: number; y: number; explodeAtElapsedMs: number },
    teamId: number
  ): BombRenderPayload {
    return {
      x: payload.x,
      y: payload.y,
      explodeAtElapsedMs: payload.explodeAtElapsedMs,
      radiusGrid: config.GAME_CONFIG.BOMB_RADIUS_GRID,
      teamId,
    };
  }

  private resolveTeamIdBySocketId(socketId: string): number {
    const playerController = this.players[socketId];
    if (!playerController) {
      return BombManager.UNKNOWN_TEAM_ID;
    }

    return playerController.getSnapshot().teamId;
  }

  private createRequestId(_elapsedMs: number): string {
    this.requestSerial += 1;
    return `${this.requestSerial}`;
  }

  private createTempBombId(requestId: string): string {
    return `temp:${requestId}`;
  }

  private removePendingRequestByRequestId(requestId: string): void {
    const tempBombId = this.pendingOwnRequestToTempBombId.get(requestId);
    if (!tempBombId) {
      return;
    }

    this.pendingOwnRequestToTempBombId.delete(requestId);
    this.pendingTempBombIdToOwnRequest.delete(tempBombId);
  }

  private removePendingRequestByTempBombId(tempBombId: string): void {
    const requestId = this.pendingTempBombIdToOwnRequest.get(tempBombId);
    if (!requestId) {
      return;
    }

    this.pendingTempBombIdToOwnRequest.delete(tempBombId);
    this.pendingOwnRequestToTempBombId.delete(requestId);
  }
}