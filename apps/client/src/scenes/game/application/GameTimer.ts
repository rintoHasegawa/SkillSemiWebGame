/**
 * GameTimer
 * サーバー基準の符号付きゲーム経過msから残り時間とカウントダウンを算出する
 * 壁時計を介さず時計同期済みの経過時間のみを参照する
 */
import { config } from "@client/config";

/**
 * サーバー基準の符号付きゲーム経過msを返す関数型
 * ゲームプレイ開始前は負値を返し，時計未同期時は null を返す
 */
export type SignedElapsedMsProvider = () => number | null;

/** ゲーム制限時間の残り秒数を管理するタイマーモデル */
export class GameTimer {
  private readonly signedElapsedMsProvider: SignedElapsedMsProvider;

  constructor(signedElapsedMsProvider: SignedElapsedMsProvider = () => null) {
    this.signedElapsedMsProvider = signedElapsedMsProvider;
  }

  public isStarted(): boolean {
    const signedElapsedMs = this.signedElapsedMsProvider();
    // 時計未同期の間は経過時間を信用できないため未開始として扱う
    if (signedElapsedMs === null) {
      return false;
    }

    return signedElapsedMs >= 0;
  }

  public getPreStartRemainingSec(): number {
    const signedElapsedMs = this.signedElapsedMsProvider();
    if (signedElapsedMs === null || signedElapsedMs >= 0) {
      return 0;
    }

    return Math.ceil(-signedElapsedMs / 1000);
  }

  public getRemainingTime(): number {
    const remainingSec =
      config.GAME_CONFIG.GAME_DURATION_SEC - this.getElapsedMs() / 1000;

    return Math.max(0, remainingSec);
  }

  public getElapsedMs(): number {
    const signedElapsedMs = this.signedElapsedMsProvider();
    if (signedElapsedMs === null) {
      return 0;
    }

    return Math.max(0, signedElapsedMs);
  }
}
