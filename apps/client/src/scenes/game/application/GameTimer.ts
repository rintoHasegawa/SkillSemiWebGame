/**
 * GameTimer
 * ゲーム開始時刻を基準に残り時間を計算する
 * 表示用の残り秒数取得を提供する
 */
import { config } from "@repo/shared";

/** ゲーム制限時間の残り秒数を管理するタイマーモデル */
export class GameTimer {
  private gameStartTime: number | null = null;

  public setGameStart(startTime: number) {
    this.gameStartTime = startTime;
  }

  public getRemainingTime(): number {
    if (!this.gameStartTime) return config.GAME_CONFIG.GAME_DURATION_SEC;

    const elapsedMs = Date.now() - this.gameStartTime;
    const remainingSec = config.GAME_CONFIG.GAME_DURATION_SEC - elapsedMs / 1000;

    return Math.max(0, remainingSec);
  }

  public getElapsedMs(): number {
    if (!this.gameStartTime) return 0;
    return Math.max(0, Date.now() - this.gameStartTime);
  }
}
