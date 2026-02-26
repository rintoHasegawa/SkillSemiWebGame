/**
 * PlayerControllerFactory
 * プレイヤー種別に応じたコントローラー生成を担当する
 * Local/Remote 分岐の生成責務を同期ハンドラから分離する
 */
import type { NewPlayerPayload } from "@repo/shared";
import {
  LocalPlayerController,
  RemotePlayerController,
} from "@client/scenes/game/entities/player/PlayerController";
import type { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";

/** PlayerControllerFactory の初期化入力 */
export type PlayerControllerFactoryOptions = {
  myId: string;
  appearanceResolver: AppearanceResolver;
};

/** プレイヤーIDに応じたコントローラーを生成する */
export class PlayerControllerFactory {
  private readonly myId: string;
  private readonly appearanceResolver: AppearanceResolver;

  constructor({ myId, appearanceResolver }: PlayerControllerFactoryOptions) {
    this.myId = myId;
    this.appearanceResolver = appearanceResolver;
  }

  /** プレイヤー生成payloadから適切なコントローラーを生成する */
  public create(playerId: string, payload: NewPlayerPayload): LocalPlayerController | RemotePlayerController {
    if (playerId === this.myId) {
      return new LocalPlayerController(payload, this.appearanceResolver);
    }

    return new RemotePlayerController(payload, this.appearanceResolver);
  }
}
