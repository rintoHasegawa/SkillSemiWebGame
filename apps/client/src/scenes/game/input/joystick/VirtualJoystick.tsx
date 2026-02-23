import { useState } from "react";

// ジョイスティック最大入力距離
export const MAX_DIST = 60;

type Props = {
  // 正規化前入力ベクトル通知コールバック
  onMove: (moveX: number, moveY: number) => void;
};

// タッチ・マウス両対応仮想ジョイスティック
export const VirtualJoystick = ({ onMove }: Props) => {
  // 入力中フラグ
  const [isMoving, setIsMoving] = useState(false);
  // ジョイスティック基準座標
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  // ノブ描画オフセット座標
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setBasePos({ x: clientX, y: clientY });
    setStickPos({ x: 0, y: 0 });
    setIsMoving(true);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isMoving) return;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - basePos.x;
    const dy = clientY - basePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const limitedDist = Math.min(dist, MAX_DIST);
    const moveX = Math.cos(angle) * limitedDist;
    const moveY = Math.sin(angle) * limitedDist;

    setStickPos({ x: moveX, y: moveY });
    // 距離制限後入力ベクトル通知
    onMove(moveX, moveY);
  };

  const handleEnd = () => {
    setIsMoving(false);
    setStickPos({ x: 0, y: 0 });
    // 入力終了時停止ベクトル通知
    onMove(0, 0);
  };

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