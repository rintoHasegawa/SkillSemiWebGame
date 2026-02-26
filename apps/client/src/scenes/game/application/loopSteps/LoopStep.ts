/**
 * LoopStep
 * ゲームループの共通ステップ契約を定義する
 * 各ステップ間で受け渡すフレーム文脈を提供する
 */
import type { Application, Container } from "pixi.js";
import type { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import type { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";

/** 1フレーム分の更新文脈を表す型 */
export type LoopFrameContext = {
  app: Application;
  worldContainer: Container;
  playerRepository: PlayerRepository;
  me: LocalPlayerController;
  deltaSeconds: number;
  isMoving: boolean;
};

/** 1フレーム内で許可する副作用操作の型 */
export type LoopFrameEffects = {
  setIsMoving: (isMoving: boolean) => void;
};

/** ゲームループ内で実行されるステップ共通インターフェース */
export type LoopStep = {
  run: (context: Readonly<LoopFrameContext>, effects: LoopFrameEffects) => void;
};