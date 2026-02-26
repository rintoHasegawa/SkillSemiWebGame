/**
 * GameSessionFacade
 * ゲーム進行状態と入力可否の問い合わせを仲介する
 * タイマーと入力ゲートの操作窓口を統一する
 */
import { GameTimer } from "@client/scenes/game/application/GameTimer";
import {
  InputGate,
  type JoystickInput,
} from "./InputGate";

/** ゲーム進行状態と入力可否の窓口を提供する */
export class GameSessionFacade {
  private readonly timer = new GameTimer();
  private readonly inputGate: InputGate;

  constructor() {
    this.inputGate = new InputGate({
      isStartedProvider: () => this.timer.isStarted(),
    });
  }

  /** サーバー同期のゲーム開始時刻を設定する */
  public setGameStart(startTime: number): void {
    this.timer.setGameStart(startTime);
  }

  /** ゲーム開始前カウントダウンの残り秒数を返す */
  public getStartCountdownSec(): number {
    return this.timer.getPreStartRemainingSec();
  }

  /** ゲーム残り時間を返す */
  public getRemainingTime(): number {
    return this.timer.getRemainingTime();
  }

  /** 経過ミリ秒を返す */
  public getElapsedMs(): number {
    return this.timer.getElapsedMs();
  }

  /** 現在入力を受け付け可能かを返す */
  public canAcceptInput(): boolean {
    return this.inputGate.canAcceptInput();
  }

  /** 入力ロックを取得し，解除関数を返す */
  public lockInput(): () => void {
    return this.inputGate.lockInput();
  }

  /** 入力可否に応じてジョイスティック入力を正規化して返す */
  public sanitizeJoystickInput(input: JoystickInput): JoystickInput {
    return this.inputGate.sanitizeJoystickInput(input);
  }

  /** セッション関連の内部状態を初期化する */
  public reset(): void {
    this.inputGate.reset();
  }
}