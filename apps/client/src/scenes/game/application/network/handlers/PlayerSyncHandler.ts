/**
 * PlayerSyncHandler
 * プレイヤー同期イベントの受信処理を担当する
 * 生成，更新，削除の適用を一元管理する
 */
import { Container } from "pixi.js";
import type {
  CurrentPlayersPayload,
  NewPlayerPayload,
  RemovePlayerPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import {
  LocalPlayerController,
  RemotePlayerController,
} from "@client/scenes/game/entities/player/PlayerController";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { PlayerRepository } from "@client/scenes/game/application/player/PlayerRepository";

/** PlayerSyncHandler の初期化入力 */
export type PlayerSyncHandlerOptions = {
  worldContainer: Container;
  playerRepository: PlayerRepository;
  myId: string;
  appearanceResolver: AppearanceResolver;
};

/** プレイヤー関連の同期イベント適用を担当する */
export class PlayerSyncHandler {
  private readonly worldContainer: Container;
  private readonly playerRepository: PlayerRepository;
  private readonly myId: string;
  private readonly appearanceResolver: AppearanceResolver;

  constructor({ worldContainer, playerRepository, myId, appearanceResolver }: PlayerSyncHandlerOptions) {
    this.worldContainer = worldContainer;
    this.playerRepository = playerRepository;
    this.myId = myId;
    this.appearanceResolver = appearanceResolver;
  }

  /** 初期プレイヤー一覧を生成して反映する */
  public handleCurrentPlayers = (serverPlayers: CurrentPlayersPayload): void => {
    serverPlayers.forEach((player) => {
      const playerController = player.id === this.myId
        ? new LocalPlayerController(player, this.appearanceResolver)
        : new RemotePlayerController(player, this.appearanceResolver);
      this.worldContainer.addChild(playerController.getDisplayObject());
      this.playerRepository.upsert(player.id, playerController);
    });
  };

  /** 新規参加プレイヤーを生成して反映する */
  public handleNewPlayer = (payload: NewPlayerPayload): void => {
    const playerController = new RemotePlayerController(payload, this.appearanceResolver);
    this.worldContainer.addChild(playerController.getDisplayObject());
    this.playerRepository.upsert(payload.id, playerController);
  };

  /** プレイヤー差分更新を反映する */
  public handlePlayerUpdates = (changedPlayers: UpdatePlayersPayload): void => {
    changedPlayers.forEach((playerData) => {
      const target = this.playerRepository.getById(playerData.id);
      if (target && target instanceof RemotePlayerController) {
        target.applyRemoteUpdate({ x: playerData.x, y: playerData.y });
      }
    });
  };

  /** 退出プレイヤーを削除する */
  public handleRemovePlayer = (id: RemovePlayerPayload): void => {
    const target = this.playerRepository.remove(id);
    if (!target) {
      return;
    }

    this.worldContainer.removeChild(target.getDisplayObject());
    target.destroy();
  };
}