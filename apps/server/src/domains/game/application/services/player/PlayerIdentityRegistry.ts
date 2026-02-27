/**
 * PlayerIdentityRegistry
 * セッション内で利用する socketId と playerId の対応付けを管理する
 */
import type { domain } from "@repo/shared";

/** プレイヤー制御主体の種別を表す型 */
export type PlayerOwnerType = "human" | "bot";

/** セッション内の playerId 対応表を管理するサービス */
export class PlayerIdentityRegistry {
  private sequenceNumber = 0;
  private socketIdToPlayerId = new Map<string, string>();
  private playerIdToSocketId = new Map<string, string>();
  private clientVisibleIdByPlayerId = new Map<string, string>();
  private playerIdByClientVisibleId = new Map<string, string>();
  private ownerTypeByPlayerId = new Map<string, PlayerOwnerType>();

  constructor(private roomId: string) {}

  /** 新しいセッション開始に向けて対応表を初期化する */
  public reset(): void {
    this.sequenceNumber = 0;
    this.socketIdToPlayerId.clear();
    this.playerIdToSocketId.clear();
    this.clientVisibleIdByPlayerId.clear();
    this.playerIdByClientVisibleId.clear();
    this.ownerTypeByPlayerId.clear();
  }

  /** 人間プレイヤー用の内部 playerId を発行して対応表へ登録する */
  public issueHumanPlayerId(socketId: string): string {
    this.sequenceNumber += 1;
    const playerId = `player:${this.roomId}:${this.sequenceNumber}`;

    this.socketIdToPlayerId.set(socketId, playerId);
    this.playerIdToSocketId.set(playerId, socketId);
    this.clientVisibleIdByPlayerId.set(playerId, socketId);
    this.playerIdByClientVisibleId.set(socketId, playerId);
    this.ownerTypeByPlayerId.set(playerId, "human");

    return playerId;
  }

  /** Botプレイヤーの内部IDを対応表へ登録する */
  public registerBotPlayerId(playerId: string): void {
    this.clientVisibleIdByPlayerId.set(playerId, playerId);
    this.playerIdByClientVisibleId.set(playerId, playerId);
    this.ownerTypeByPlayerId.set(playerId, "bot");
  }

  /** socketId から内部 playerId を解決する */
  public resolvePlayerIdFromSocketId(socketId: string): string | undefined {
    return this.socketIdToPlayerId.get(socketId);
  }

  /** クライアント互換IDから内部 playerId を解決する */
  public resolvePlayerIdFromClientVisibleId(clientVisibleId: string): string | undefined {
    return this.playerIdByClientVisibleId.get(clientVisibleId);
  }

  /** 内部 playerId をクライアント互換IDへ変換する */
  public resolveClientVisibleId(playerId: string): string {
    return this.clientVisibleIdByPlayerId.get(playerId) ?? playerId;
  }

  /** 内部 playerId に紐づく現在の socketId を解決する */
  public resolveSocketId(playerId: string): string | undefined {
    return this.playerIdToSocketId.get(playerId);
  }

  /** 切断した人間プレイヤーをBot制御へ切り替える */
  public promoteHumanToBotBySocketId(socketId: string): boolean {
    const playerId = this.socketIdToPlayerId.get(socketId);
    if (!playerId) {
      return false;
    }

    this.socketIdToPlayerId.delete(socketId);
    this.playerIdToSocketId.delete(playerId);
    this.ownerTypeByPlayerId.set(playerId, "bot");
    return true;
  }

  /** プレイヤー一覧をクライアント互換IDへ変換する */
  public toClientVisiblePlayers(
    players: domain.player.PlayerData[],
  ): domain.player.PlayerData[] {
    return players.map((player) => {
      return {
        ...player,
        id: this.resolveClientVisibleId(player.id),
      };
    });
  }

  /** プレイヤー差分をクライアント互換IDへ変換する */
  public toClientVisiblePlayerUpdates(
    playerUpdates: domain.game.PlayerPositionUpdate[],
  ): domain.game.PlayerPositionUpdate[] {
    return playerUpdates.map((playerUpdate) => {
      return {
        ...playerUpdate,
        id: this.resolveClientVisibleId(playerUpdate.id),
      };
    });
  }
}
