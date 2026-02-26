/**
 * PlayerController
 * 外部入出力とModel/Viewの橋渡しを担うコントローラー群
 * ローカル入力適用，リモート更新適用，描画同期を分離して扱う
 */
import type { playerTypes } from "@repo/shared";
import { config } from "@client/config";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { BombHitBlinkRenderer } from "@client/scenes/game/entities/bomb/BombHitBlinkRenderer";
import { PlayerModel } from "./PlayerModel";
import { PlayerView } from "./PlayerView";

/** ローカル移動入力を表す型 */
export type LocalInput = {
  axisX: number;
  axisY: number;
  deltaTime: number;
};

/** リモート移動更新を表す型 */
export type RemoteUpdate = Partial<playerTypes.MovePayload>;

/**
 * ローカル用コントローラーとリモート用コントローラーの共通基底
 */
abstract class BasePlayerController {
  protected readonly model: PlayerModel;
  protected readonly view: PlayerView;
  private readonly bombHitBlinkRenderer: BombHitBlinkRenderer;

  /** 共通初期化としてModelとViewを生成する */
  protected constructor(
    data: playerTypes.PlayerData,
    isLocal: boolean,
    appearanceResolver: AppearanceResolver,
  ) {
    this.model = new PlayerModel(data);
    this.view = new PlayerView(
      appearanceResolver.resolvePlayerImageFile(data.teamId),
      data.name,
      isLocal,
    );
    this.bombHitBlinkRenderer = new BombHitBlinkRenderer({
      target: this.view.displayObject,
      blinkIntervalMs: config.GAME_CONFIG.PLAYER_HIT_BLINK_INTERVAL_MS,
      hiddenAlpha: config.GAME_CONFIG.PLAYER_HIT_BLINK_HIDDEN_ALPHA,
      maxDeltaMs: config.GAME_CONFIG.PLAYER_HIT_BLINK_MAX_DELTA_MS,
    });

    const pos = this.model.getPosition();
    this.view.syncPosition(pos.x, pos.y);
  }

  /** 描画オブジェクトを取得する */
  public getDisplayObject() {
    return this.view.displayObject;
  }

  /** 現在座標を取得する */
  public getPosition(): playerTypes.MovePayload {
    return this.model.getPosition();
  }

  /** 外部送信用スナップショットを取得する */
  public getSnapshot(): playerTypes.PlayerData {
    return this.model.getSnapshot();
  }

  /** 爆弾被弾時の点滅演出を再生する */
  public playBombHitBlink(durationMs: number): void {
    this.bombHitBlinkRenderer.play(durationMs);
  }

  /** 管理中の描画リソースを破棄する */
  public destroy(): void {
    this.bombHitBlinkRenderer.destroy();
    this.view.destroy();
  }
}

/** ローカルプレイヤーの入力適用と描画同期を担うコントローラー */
export class LocalPlayerController extends BasePlayerController {
  /** ローカルプレイヤー用コントローラーを初期化する */
  constructor(
    data: playerTypes.PlayerData,
    appearanceResolver: AppearanceResolver,
  ) {
    super(data, true, appearanceResolver);
  }

  /** ローカル入力を座標計算へ適用する */
  public applyLocalInput(input: LocalInput): void {
    this.model.moveLocal(input.axisX, input.axisY, input.deltaTime);
  }

  /** 毎フレームの描画同期を行う */
  public tick(): void {
    const pos = this.model.getPosition();
    this.view.syncPosition(pos.x, pos.y);
  }
}

/** リモートプレイヤーの更新適用と補間同期を担うコントローラー */
export class RemotePlayerController extends BasePlayerController {
  /** リモートプレイヤー用コントローラーを初期化する */
  constructor(
    data: playerTypes.PlayerData,
    appearanceResolver: AppearanceResolver,
  ) {
    super(data, false, appearanceResolver);
  }

  /** ネットワーク更新を目標座標へ反映する */
  public applyRemoteUpdate(update: RemoteUpdate): void {
    this.model.setRemoteTarget(update);
  }

  /** 毎フレームの補間更新と描画同期を行う */
  public tick(deltaTime: number): void {
    this.model.updateRemoteLerp(deltaTime);
    const pos = this.model.getPosition();
    this.view.syncPosition(pos.x, pos.y);
  }
}
