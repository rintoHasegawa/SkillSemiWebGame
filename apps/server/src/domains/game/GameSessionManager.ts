import { type TickData } from "./loop/GameLoop";
import { Player } from "./entities/player/Player.js";
import { GameSessionService } from "./application/services/GameSessionService";

// ルーム単位セッションの生成・更新・参照管理クラス
export class GameSessionManager {
  private gameSessionService: GameSessionService;

  constructor() {
    this.gameSessionService = new GameSessionService();
  }

  // 外部（GameHandlerなど）から開始時刻を取得できるようにする
  getRoomStartTime(roomId: string): number | undefined {
    return this.gameSessionService.getRoomStartTime(roomId);
  }

  // プレイヤー登録解除処理
  removePlayer(id: string) {
    this.gameSessionService.removePlayer(id);
  }

  // 指定プレイヤー座標更新処理
  movePlayer(id: string, x: number, y: number) {
    this.gameSessionService.movePlayer(id, x, y);
  }

  /**
   * 20Hz固定のゲームループを開始する
   * @param roomId ルームID
   * @param playerIds このルームに参加しているプレイヤーのIDリスト
   * @param onTick 毎フレーム実行される送信用のコールバック関数
   */
  startRoomSession(
    roomId: string, 
    playerIds: string[], 
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ) {
    this.gameSessionService.startRoomSession(roomId, playerIds, onTick, onGameEnd);
  }

  // 指定ルームのプレイヤーを取得
  getRoomPlayers(roomId: string): Player[] {
    return this.gameSessionService.getRoomPlayers(roomId);
  }
}