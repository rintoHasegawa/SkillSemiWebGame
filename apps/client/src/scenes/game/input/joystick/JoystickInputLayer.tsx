/**
 * JoystickInputLayer
 * 画面上のジョイスティック入力レイヤーの入口
 * 入力イベントの受け口として JoystickCoordinator に処理を委譲する
 */
import { JoystickCoordinator } from "./JoystickCoordinator";

/** 入力半径の既定値を外部から参照できるように再公開 */
export { MAX_DIST } from "./common";

/** JoystickInputLayer の入力コールバック */
type Props = {
  onInput: (moveX: number, moveY: number) => void;
  maxDist?: number;
};

/** 入力の入口として配線を行う */
export const JoystickInputLayer = ({ onInput, maxDist }: Props) => {
  return (
    <JoystickCoordinator onInput={onInput} maxDist={maxDist}>
      {({ view, handleStart, handleMove, handleEnd }) => (
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
          {/* 入力イベントを仲介へ渡し，出力は別レイヤーで処理する */}
          {view}
        </div>
      )}
    </JoystickCoordinator>
  );
};