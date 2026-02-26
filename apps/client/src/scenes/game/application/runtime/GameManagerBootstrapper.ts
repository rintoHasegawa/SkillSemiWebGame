/**
 * GameManagerBootstrapper
 * GameManagerの起動配線を担当する
 * 初期化順序と中断時処理を一元管理する
 */
import { Application, Ticker } from "pixi.js";
import type { SceneLifecycleState } from "@client/scenes/game/application/lifecycle/SceneLifecycleState";
import type { GameSceneRuntime } from "./GameSceneRuntime";

/** 起動配線処理の入力型 */
export type GameManagerBootstrapperOptions = {
  app: Application;
  lifecycleState: SceneLifecycleState;
  container: HTMLDivElement;
  runtime: GameSceneRuntime;
  tick: (ticker: Ticker) => void;
};

/** 起動配線処理の成否を返す結果型 */
export type GameManagerBootstrapResult = {
  initialized: boolean;
};

/** 起動配線の実行を担当する */
export class GameManagerBootstrapper {
  private readonly options: GameManagerBootstrapperOptions;

  constructor(options: GameManagerBootstrapperOptions) {
    this.options = options;
  }

  /** GameManagerの起動配線を実行する */
  public async bootstrap(): Promise<GameManagerBootstrapResult> {
    await this.options.app.init({
      resizeTo: window,
      backgroundColor: 0x111111,
      antialias: true,
    });

    if (this.options.lifecycleState.shouldAbortInit()) {
      this.options.app.destroy(true, { children: true });
      return { initialized: false };
    }

    this.options.container.appendChild(this.options.app.canvas);
    this.options.runtime.initialize();
    this.options.runtime.readyForGame();
    this.options.app.ticker.add(this.options.tick);
    this.options.lifecycleState.markInitialized();

    return { initialized: true };
  }
}
