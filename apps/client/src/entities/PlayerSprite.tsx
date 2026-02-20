import { useCallback } from "react";
import { Graphics } from "@pixi/react";

// 受け取るデータの型を定義
type PlayerProps = {
  x: number;
  y: number;
  color: string;
  isMe: boolean;
};

export const PlayerSprite = ({ x, y, color, isMe }: PlayerProps) => {
  const draw = useCallback(
    (g: any) => {
      g.clear();
      const hexColor = parseInt(color.replace("#", "0x"), 16) || 0xff0000;

      g.beginFill(hexColor);
      g.drawCircle(0, 0, 10);
      g.endFill();

      // 自分の場合は黄色い枠線をつける
      if (isMe) {
        g.lineStyle(3, 0xffff00);
        g.drawCircle(0, 0, 10);
      }
    },
    [color, isMe]
  );

  return <Graphics draw={draw} x={x} y={y} />;
};