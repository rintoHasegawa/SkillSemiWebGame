/**
 * BombManager
 * 爆弾サブシステムの各サービスを調停する
 * 外部APIを維持しつつ内部責務を分離する
 */
import type { Container } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  PlaceBombPayload,
} from "@repo/shared";
import type { WorldViewport } from "@client/scenes/game/application/culling/worldViewport";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { BombIdRegistry } from "./BombIdRegistry";
import type { GamePlayers } from "@client/scenes/game/application/game.types";
import { BombRepository, type BombRenderPayload } from "./runtime/BombRepository";
import { BombPlacementService } from "./services/BombPlacementService";
import { BombAckReconciler } from "./services/BombAckReconciler";
import { BombRuntimeSystem } from "./runtime/BombRuntimeSystem";

/** 経過時間ミリ秒を返す関数型 */
export type ElapsedMsProvider = () => number;

/** 爆弾の描画更新に使う入力データ型 */
export type { BombRenderPayload };

/** 爆弾設置時に返す結果型 */
export type BombPlacementResult = {
  tempBombId: string;
  payload: PlaceBombPayload;
};

/** 爆弾爆発時に外部へ通知するペイロード型 */
export type BombExplodedPayload = {
  bombId: string;
  x: number;
  y: number;
  radius: number;
  teamId: number;
};

type BombManagerOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getElapsedMs: ElapsedMsProvider;
  appearanceResolver: AppearanceResolver;
  onBombExploded?: (payload: BombExplodedPayload) => void;
};

/** 爆弾エンティティのライフサイクルを管理する */
export class BombManager {
  private readonly getElapsedMs: ElapsedMsProvider;
  private readonly bombIdRegistry = new BombIdRegistry();
  private readonly bombRepository: BombRepository;
  private readonly bombPlacementService: BombPlacementService;
  private readonly bombAckReconciler: BombAckReconciler;
  private readonly bombRuntimeSystem: BombRuntimeSystem;

  constructor({ worldContainer, players, myId, getElapsedMs, appearanceResolver, onBombExploded }: BombManagerOptions) {
    this.getElapsedMs = getElapsedMs;

    this.bombRepository = new BombRepository({
      worldContainer,
      bombIdRegistry: this.bombIdRegistry,
    });
    this.bombPlacementService = new BombPlacementService({
      players,
      myId,
      getElapsedMs,
      appearanceResolver,
      bombIdRegistry: this.bombIdRegistry,
    });
    this.bombAckReconciler = new BombAckReconciler({
      bombIdRegistry: this.bombIdRegistry,
      bombRepository: this.bombRepository,
    });
    this.bombRuntimeSystem = new BombRuntimeSystem({
      bombRepository: this.bombRepository,
      onBombExploded,
    });
  }

  /** 自プレイヤー位置に爆弾を仮IDで設置し，設置要求を返す */
  public placeBomb(): BombPlacementResult | null {
    const ownPlacement = this.bombPlacementService.placeOwnBomb();
    if (!ownPlacement) {
      return null;
    }

    this.upsertBomb(ownPlacement.tempBombId, ownPlacement.renderPayload);
    return {
      tempBombId: ownPlacement.tempBombId,
      payload: ownPlacement.payload,
    };
  }

  /** 他プレイヤー向けの爆弾確定イベントを反映する */
  public applyPlacedBombFromOthers(payload: BombPlacedPayload): void {
    this.upsertBomb(
      payload.bombId,
      this.bombPlacementService.createRenderPayload(payload),
    );
  }

  /** 設置者本人向けACKを反映し，仮IDから正式IDへ置換する */
  public applyPlacedBombAck(payload: BombPlacedAckPayload): void {
    this.bombAckReconciler.applyPlacedBombAck(payload);
  }

  /** 描画ペイロードで指定IDの爆弾を追加または更新する */
  public upsertBomb(bombId: string, payload: BombRenderPayload): void {
    this.bombRepository.upsertBomb(bombId, payload);
  }

  /** 指定IDの爆弾を削除する */
  public removeBomb(bombId: string): void {
    this.bombRepository.removeBomb(bombId);
  }

  /** 爆弾状態を更新し終了済みを破棄する */
  public tick(): void {
    this.bombRuntimeSystem.tick(this.getElapsedMs());
  }

  /** 可視矩形に基づいて爆弾表示を切り替える */
  public applyViewportCulling(viewport: WorldViewport, marginPx: number): void {
    this.bombRepository.applyViewportCulling(viewport, marginPx);
  }

  /** 管理中の爆弾をすべて破棄する */
  public destroy(): void {
    this.bombRepository.clear();
    this.bombIdRegistry.clear();
  }
}