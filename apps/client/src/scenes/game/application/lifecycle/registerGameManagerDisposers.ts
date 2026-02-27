/**
 * registerGameManagerDisposers
 * GameManager の破棄処理登録を集約する
 * 破棄順序を固定して安全にクリーンアップする
 */
import type { Application } from "pixi.js";
import type { DisposableRegistry } from "./DisposableRegistry";
import type { GameUiStateSyncService } from "../ui/GameUiStateSyncService";
import type { GameSessionFacade } from "./GameSessionFacade";
import type { CombatLifecycleFacade } from "../combat/CombatLifecycleFacade";
import type { GameSceneRuntime } from "../runtime/GameSceneRuntime";
import type { SceneLifecycleState } from "./SceneLifecycleState";

/** GameManager の破棄登録に必要な依存型 */
export type RegisterGameManagerDisposersParams = {
  disposableRegistry: DisposableRegistry;
  uiStateSyncService: GameUiStateSyncService;
  resetPlayers: () => void;
  sessionFacade: GameSessionFacade;
  combatFacade: CombatLifecycleFacade;
  runtime: GameSceneRuntime;
  lifecycleState: SceneLifecycleState;
  app: Application;
};

/** GameManager の破棄処理を逆順実行前提で登録する */
export const registerGameManagerDisposers = ({
  disposableRegistry,
  uiStateSyncService,
  resetPlayers,
  sessionFacade,
  combatFacade,
  runtime,
  lifecycleState,
  app,
}: RegisterGameManagerDisposersParams): void => {
  disposableRegistry.add(() => {
    uiStateSyncService.clear();
  });
  disposableRegistry.add(() => {
    resetPlayers();
  });
  disposableRegistry.add(() => {
    sessionFacade.reset();
  });
  disposableRegistry.add(() => {
    combatFacade.dispose();
  });
  disposableRegistry.add(() => {
    if (lifecycleState.shouldDestroyApp()) {
      app.destroy(true, { children: true });
    }
  });
  disposableRegistry.add(() => {
    runtime.destroy();
  });
  disposableRegistry.add(() => {
    uiStateSyncService.stopTicker();
  });
};
