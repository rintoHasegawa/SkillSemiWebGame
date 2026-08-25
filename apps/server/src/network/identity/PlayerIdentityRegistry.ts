/**
 * PlayerIdentityRegistry
 * ソケットIDとプレイヤーIDの対応を双方向に保持するレジストリ
 * 試合復帰時に新しいソケットへ切断前のプレイヤーIDを引き継ぐために利用する
 * 併せて，登録済みハンドラから現在のプレイヤーIDを引くための解決関数も提供する
 */
import type { Socket } from "socket.io";

/** ソケットIDとプレイヤーIDの対応を管理するレジストリ */
export class PlayerIdentityRegistry {
  private playerIdBySocketId: Map<string, string> = new Map();
  private socketIdByPlayerId: Map<string, string> = new Map();

  /** ソケットへプレイヤーIDを結び付ける（既存の対応は上書きする） */
  public bind(socketId: string, playerId: string): void {
    // 同じプレイヤーを指す古いソケットの対応が残らないよう先に解消する
    const previousSocketId = this.socketIdByPlayerId.get(playerId);
    if (previousSocketId !== undefined && previousSocketId !== socketId) {
      this.playerIdBySocketId.delete(previousSocketId);
    }

    const previousPlayerId = this.playerIdBySocketId.get(socketId);
    if (previousPlayerId !== undefined && previousPlayerId !== playerId) {
      this.socketIdByPlayerId.delete(previousPlayerId);
    }

    this.playerIdBySocketId.set(socketId, playerId);
    this.socketIdByPlayerId.set(playerId, socketId);
  }

  /**
   * ソケットIDに対応するプレイヤーIDを返す
   * 未登録のソケットは従来どおりソケットIDをそのままプレイヤーIDとして扱う
   */
  public resolvePlayerId(socketId: string): string {
    return this.playerIdBySocketId.get(socketId) ?? socketId;
  }

  /** プレイヤーIDに対応する現在のソケットIDを返す */
  public getSocketId(playerId: string): string | undefined {
    return this.socketIdByPlayerId.get(playerId);
  }

  /** 切断ソケットの対応を解放する */
  public release(socketId: string): void {
    const playerId = this.playerIdBySocketId.get(socketId);
    this.playerIdBySocketId.delete(socketId);

    if (playerId === undefined) {
      return;
    }

    // 別ソケットへ載せ替え済みの対応は消さない
    if (this.socketIdByPlayerId.get(playerId) === socketId) {
      this.socketIdByPlayerId.delete(playerId);
    }
  }
}

/** 参照のたびに現在のプレイヤーIDを返す解決関数 */
export type CurrentPlayerIdResolver = () => string;

/**
 * ソケットの現在のプレイヤーIDを解決する関数を生成する
 * 受信ハンドラの登録は接続時に一度きりのため，登録時点のプレイヤーIDを固定値として
 * 保持すると，復帰後も切断前の対応が反映されず古いIDを使い続けてしまう
 * これを避けるため，呼び出しのたびにレジストリへ問い合わせる関数として渡す
 */
export const createCurrentPlayerIdResolver = (
  identityRegistry: Pick<PlayerIdentityRegistry, "resolvePlayerId">,
  socket: Pick<Socket, "id">,
): CurrentPlayerIdResolver => {
  return () => identityRegistry.resolvePlayerId(socket.id);
};
