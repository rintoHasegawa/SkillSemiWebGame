/**
 * JoystickCoordinator
 * JoystickInputLayer からの入力を受け取り，処理と描画をまとめて仲介する
 * 入力処理は useJoystick に委譲し，描画は JoystickView に委譲する
 */
import type React from "react";
import { JoystickView } from "./JoystickView";
import { useJoystick } from "./useJoystick";

/** JoystickCoordinator が提供する描画用データと入力ハンドラ */
type RenderProps = {
  view: React.ReactNode;
  handleStart: (e: React.TouchEvent | React.MouseEvent) => void;
  handleMove: (e: React.TouchEvent | React.MouseEvent) => void;
  handleEnd: () => void;
};

/** 表示に必要な座標と状態 */
type Props = {
  onInput: (moveX: number, moveY: number) => void;
  maxDist?: number;
  children: (props: RenderProps) => React.ReactNode;
};

/** 受け取った入力から描画用の状態を生成し，描画を仲介する */
export const JoystickCoordinator = ({ onInput, maxDist, children }: Props) => {
  const { isMoving, center, knobOffset, radius, handleStart, handleMove, handleEnd } =
    useJoystick({ onInput, maxDist });

  const view = (
    <JoystickView isActive={isMoving} center={center} knobOffset={knobOffset} radius={radius} />
  );

  return <>{children({ view, handleStart, handleMove, handleEnd })}</>;
};
