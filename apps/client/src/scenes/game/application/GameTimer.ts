import { config } from "@repo/shared";

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
}
