/**
 * BombAckReconciler
 * 爆弾設置ACKを仮IDから正式IDへ反映する
 * requestId と tempBombId の対応解決を担う
 */
import type { BombPlacedAckPayload } from "@repo/shared";
import { BombIdRegistry } from "@client/scenes/game/entities/bomb/BombIdRegistry";
import { BombRepository } from "@client/scenes/game/entities/bomb/runtime/BombRepository";

/** BombAckReconciler の初期化入力 */
export type BombAckReconcilerOptions = {
  bombIdRegistry: BombIdRegistry;
  bombRepository: BombRepository;
};

/** 爆弾設置ACKの反映処理を担う */
export class BombAckReconciler {
  private readonly bombIdRegistry: BombIdRegistry;
  private readonly bombRepository: BombRepository;

  constructor({ bombIdRegistry, bombRepository }: BombAckReconcilerOptions) {
    this.bombIdRegistry = bombIdRegistry;
    this.bombRepository = bombRepository;
  }

  /** 設置者本人向けACKを反映し，仮IDから正式IDへ置換する */
  public applyPlacedBombAck(payload: BombPlacedAckPayload): void {
    const tempBombId = this.bombIdRegistry.resolveTempBombIdByRequestId(payload.requestId);
    if (!tempBombId) {
      return;
    }

    const tempPayload = this.bombRepository.getRenderPayload(tempBombId);
    this.bombIdRegistry.removeByRequestId(payload.requestId);
    if (tempBombId === payload.bombId) {
      return;
    }

    // 描画ペイロードの有無に関わらず仮IDの実体を破棄し，
    // 被弾報告が仮IDのままサーバへ送られる状態を残さない
    this.bombRepository.removeBomb(tempBombId);

    if (!tempPayload) {
      // ACKは座標を含まないため正式IDでの再生成ができない
      console.error(
        "[BombAckReconciler] 仮IDの描画情報が無いため正式IDへ差し替えできない: "
          + `${tempBombId} -> ${payload.bombId}`,
      );
      return;
    }

    this.bombRepository.upsertBomb(payload.bombId, tempPayload);
  }
}
