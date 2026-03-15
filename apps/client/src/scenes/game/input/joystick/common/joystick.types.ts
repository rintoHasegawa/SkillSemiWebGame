/**
 * joystick.types
 * ジョイスティック入力で使う型をまとめる
 * 座標や入力の共通表現を定義する
 */

import type React from "react";

/** 2D座標の簡易型 */
export type Point = { x: number; y: number };

/** 正規化された入力ベクトル */
export type NormalizedInput = { x: number; y: number };

/** ジョイスティックで扱うポインター入力イベント型 */
export type JoystickPointerEvent = React.PointerEvent<HTMLDivElement>;

/** useJoystickState に渡す設定型 */
export type UseJoystickStateProps = {
  maxDist?: number;
  onNormalizedInput?: (normalized: NormalizedInput) => void;
};

/** useJoystickState が返すUI向けの状態とハンドラ型 */
export type UseJoystickStateReturn = {
  isMoving: boolean;
  center: Point;
  knobOffset: Point;
  radius: number;
  handleStart: (e: JoystickPointerEvent) => void;
  handleMove: (e: JoystickPointerEvent) => NormalizedInput | null;
  handleEnd: (e: JoystickPointerEvent) => void;
  reset: () => void;
};

/** useJoystickController に渡す入力設定型 */
export type UseJoystickControllerProps = {
  onInput: (moveX: number, moveY: number) => void;
  maxDist?: number;
};

/** useJoystickController が返す描画状態と入力ハンドラ型 */
export type UseJoystickControllerReturn = {
  isMoving: boolean;
  center: Point;
  knobOffset: Point;
  radius: number;
  handleStart: (e: JoystickPointerEvent) => void;
  handleMove: (e: JoystickPointerEvent) => void;
  handleEnd: (e: JoystickPointerEvent) => void;
  reset: () => void;
};

/** JoystickInputPresenter に渡す入力設定型 */
export type UseJoystickInputPresenterProps = {
  onInput: (moveX: number, moveY: number) => void;
  maxDist?: number;
  isEnabled?: boolean;
};

/** JoystickView に渡す描画状態型 */
export type UseJoystickViewProps = {
  isActive: boolean;
  center: Point;
  knobOffset: Point;
  radius: number;
};
