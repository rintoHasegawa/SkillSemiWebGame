/**
 * GameTimer
 * ゲーム開始時刻を基準に残り時間を計算する
 * 表示用の残り秒数取得を提供する
 */
import { config } from "@client/config";
import { SYSTEM_TIME_PROVIDER } from "@client/scenes/game/application/time/TimeProvider";

/** 現在時刻ミリ秒を返す関数型 */
export type NowMsProvider = () => number;

/** ゲーム制限時間の残り秒数を管理するタイマーモデル */
export class GameTimer {
  private gameStartTime: number | null = null;
  private nowMsProvider: NowMsProvider;

  constructor(nowMsProvider: NowMsProvider = SYSTEM_TIME_PROVIDER.now) {
    this.nowMsProvider = nowMsProvider;
  }

  public setGameStart(startTime: number): void {
    this.gameStartTime = startTime;
  }

  public getStartTime(): number | null {
    return this.gameStartTime;
  }

  public isStarted(): boolean {
    // 0 も有効なエポック時刻のため未設定判定は null のみで行う
    if (this.gameStartTime === null) {
      return false;
    }

    return this.nowMsProvider() >= this.gameStartTime;
  }

  public getPreStartRemainingSec(): number {
    if (this.gameStartTime === null) {
      return 0;
    }

    const remainingMs = this.gameStartTime - this.nowMsProvider();
    if (remainingMs <= 0) {
      return 0;
    }

    return Math.ceil(remainingMs / 1000);
  }

  public getRemainingTime(): number {
    if (this.gameStartTime === null) {
      return config.GAME_CONFIG.GAME_DURATION_SEC;
    }

    const nowMs = this.nowMsProvider();
    if (nowMs < this.gameStartTime) {
      return config.GAME_CONFIG.GAME_DURATION_SEC;
    }

    const elapsedMs = nowMs - this.gameStartTime;
    const remainingSec =
      config.GAME_CONFIG.GAME_DURATION_SEC - elapsedMs / 1000;

    return Math.max(0, remainingSec);
  }

  public getElapsedMs(): number {
    if (this.gameStartTime === null) {
      return 0;
    }

    return Math.max(0, this.nowMsProvider() - this.gameStartTime);
  }
}
