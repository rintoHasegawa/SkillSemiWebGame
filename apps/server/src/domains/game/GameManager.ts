import { GameLoop, type TickData } from "./GameLoop";
import type { gridMapTypes } from "@repo/shared";
import { Player } from "./entities/Player.js";
import { PlayerRegistry } from "./application/services/PlayerRegistry";
import { GameSessionService } from "./application/services/GameSessionService";

// プレイヤー集合の生成・更新・参照管理クラス
export class GameManager {
  private playerRegistry: PlayerRegistry;
  private gameSessionService: GameSessionService;

  constructor() {
    this.playerRegistry = new PlayerRegistry();
    this.gameSessionService = new GameSessionService(this.playerRegistry.getPlayersRef());
  }

  // 外部（GameHandlerなど）から開始時刻を取得できるようにする
  getRoomStartTime(roomId: string): number | undefined {
    return this.gameSessionService.getRoomStartTime(roomId);
  }

  // 新規プレイヤー登録と初期位置設定処理
  addPlayer(id: string): Player {
    return this.playerRegistry.addPlayer(id);
  }

  // プレイヤー登録解除処理
  removePlayer(id: string) {
    this.playerRegistry.removePlayer(id);
  }

  // 指定IDプレイヤー参照取得
  getPlayer(id: string) {
    return this.playerRegistry.getPlayer(id);
  }

  // 指定プレイヤー座標更新処理
  movePlayer(id: string, x: number, y: number) {
    this.playerRegistry.movePlayer(id, x, y);
  }

  /**
   * 20Hz固定のゲームループを開始する
   * @param roomId ルームID
   * @param playerIds このルームに参加しているプレイヤーのIDリスト
   * @param onTick 毎フレーム実行される送信用のコールバック関数
   */
  startGameLoop(
    roomId: string, 
    playerIds: string[], 
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ) {
    this.gameSessionService.startGameLoop(roomId, playerIds, onTick, onGameEnd);
  }

  /**
   * ゲームループを停止する
   */
  stopGameLoop(roomId: string) {
    this.gameSessionService.stopGameLoop(roomId);
  }

  // 登録中全プレイヤー配列取得
  getAllPlayers() {
    return this.playerRegistry.getAllPlayers();
  }

  // 指定ID配列のプレイヤーを取得
  getPlayersByIds(playerIds: string[]) {
    return playerIds
      .map((playerId) => this.playerRegistry.getPlayer(playerId))
      .filter((player): player is Player => player !== undefined);
  }

  // 【一時的】移動したプレイヤーの足元を塗り、差分を返すメソッド
  public paintAndGetUpdates(roomId: string, playerId: string): gridMapTypes.CellUpdate[] {
    return this.gameSessionService.paintAndGetUpdates(roomId, playerId);
  }
}