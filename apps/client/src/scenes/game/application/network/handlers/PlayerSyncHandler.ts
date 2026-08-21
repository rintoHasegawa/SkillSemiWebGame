/**
 * PlayerSyncHandler
 * プレイヤー同期イベントの受信処理を担当する
 * 生成，更新，削除の適用を一元管理する
 */
import { Container } from "pixi.js";
import type {
  CurrentPlayerMetaPayload,
  CurrentPlayerBootstrapPayload,
  CurrentPlayersPayload,
  NewPlayerPayload,
  RemovePlayerPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import { config as sharedConfig } from "@repo/shared";
import {
  RemotePlayerController,
} from "@client/scenes/game/entities/player/PlayerController";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { PlayerControllerFactory } from "./PlayerControllerFactory";

const ENABLE_DEBUG_LOG = import.meta.env.DEV;

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
  private readonly playerControllerFactory: PlayerControllerFactory;
  /** 座標なしで受信したプレイヤーも含むメタ情報の保持先 */
  private readonly playerMetaById = new Map<string, CurrentPlayerMetaPayload>();

  constructor({ worldContainer, playerRepository, myId, appearanceResolver }: PlayerSyncHandlerOptions) {
    this.worldContainer = worldContainer;
    this.playerRepository = playerRepository;
    this.myId = myId;
    this.playerControllerFactory = new PlayerControllerFactory({
      myId,
      appearanceResolver,
    });
  }

  /**
   * 初期プレイヤー一覧を受信し，座標付き要素のみ実体生成する
   * 座標なし要素はメタ情報のみ保持し，差分更新受信時の遅延生成に使う
   */
  public handleCurrentPlayers = (serverPlayers: CurrentPlayersPayload): void => {
    serverPlayers.forEach((player) => {
      this.upsertFromCurrentPlayerBootstrapPayload(player);
    });
  };

  /** 新規参加プレイヤーを生成して反映する */
  public handleNewPlayer = (payload: NewPlayerPayload): void => {
    this.upsertFromNewPlayerPayload(payload);
  };

  /** プレイヤー差分更新を反映する（自分自身は除外する） */
  public handlePlayerUpdates = (changedPlayers: UpdatePlayersPayload): void => {
    changedPlayers.forEach((playerData) => {
      if (playerData.id === this.myId) {
        return;
      }

      const target = this.playerRepository.getById(playerData.id);
      if (!target) {
        // new-player 取りこぼし時でも描画を回復させるため遅延生成する
        this.createLazyRemotePlayer(playerData.id, playerData.x, playerData.y);
        return;
      }

      if (target instanceof RemotePlayerController) {
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

  private replacePlayerController(playerId: string, payload: NewPlayerPayload): void {
    const existing = this.playerRepository.remove(playerId);
    if (existing) {
      this.worldContainer.removeChild(existing.getDisplayObject());
      existing.destroy();
    }

    const playerController = this.playerControllerFactory.create(playerId, payload);

    this.worldContainer.addChild(playerController.getDisplayObject());
    this.playerRepository.upsert(playerId, playerController);
  }

  /**
   * update-players のみ届いたプレイヤーを既知メタ情報から遅延生成する
   * メタ情報が無い場合は未確定チームとして生成し，new-player 受信時に差し替える
   */
  private createLazyRemotePlayer(playerId: string, x: number, y: number): void {
    if (ENABLE_DEBUG_LOG) {
      console.log(
        `[PlayerSyncHandler] 未登録IDの差分更新を受信したため遅延生成: ${playerId}`,
      );
    }

    const meta = this.playerMetaById.get(playerId);
    this.upsertFromNewPlayerPayload({
      id: playerId,
      name: meta?.name ?? "",
      teamId: meta?.teamId ?? sharedConfig.UNKNOWN_TEAM_ID,
      x,
      y,
    });
  }

  /** 生成有無に関わらずプレイヤーのメタ情報を記録する */
  private rememberPlayerMeta(payload: CurrentPlayerMetaPayload): void {
    this.playerMetaById.set(payload.id, {
      id: payload.id,
      name: payload.name,
      teamId: payload.teamId,
    });
  }

  /** current-players要素から初期表示用の実体生成を行う */
  private upsertFromCurrentPlayerBootstrapPayload(
    payload: CurrentPlayerBootstrapPayload,
  ): void {
    // 座標なし要素はAOI外のため生成しないが，メタ情報だけは保持する
    this.rememberPlayerMeta(payload);

    if (!this.hasBootstrapPosition(payload)) {
      return;
    }

    this.upsertFromNewPlayerPayload({
      id: payload.id,
      name: payload.name,
      teamId: payload.teamId,
      x: payload.x,
      y: payload.y,
    });
  }

  /** current-players要素が初期表示座標を含むか判定する */
  private hasBootstrapPosition(
    payload: CurrentPlayerBootstrapPayload,
  ): payload is CurrentPlayerMetaPayload & Pick<NewPlayerPayload, "x" | "y"> {
    return "x" in payload && "y" in payload;
  }

  /** new-player情報から実体生成を行う */
  private upsertFromNewPlayerPayload(payload: NewPlayerPayload): void {
    this.rememberPlayerMeta(payload);
    this.replacePlayerController(payload.id, payload);
  }
}
