import { MAX_DIST, useJoystick } from "./useJoystick";

export { MAX_DIST } from "./useJoystick";

type Props = {
  onInput: (moveX: number, moveY: number) => void;
};

export const Joystick = ({ onInput }: Props) => {
  const { isMoving, basePos, stickPos, handleStart, handleMove, handleEnd } =
    useJoystick({ onInput });

  return (
    <div
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        // キャンバス前面入力キャプチャレイヤー
        zIndex: 10,
        touchAction: "none",
      }}
    >
      {isMoving && (
        <div
          style={{
            position: "fixed",
            left: basePos.x - MAX_DIST,
            top: basePos.y - MAX_DIST,
            width: MAX_DIST * 2,
            height: MAX_DIST * 2,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 40,
              height: 40,
              background: "rgba(255, 255, 255, 0.8)",
              borderRadius: "50%",
              transform: `translate(calc(-50% + ${stickPos.x}px), calc(-50% + ${stickPos.y}px))`,
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
    </div>
  );
};