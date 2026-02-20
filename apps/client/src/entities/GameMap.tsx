import { useCallback } from "react";
import { Graphics } from "@pixi/react";

// マップの広さ（他のファイルでも使えるように export する）
export const MAP_SIZE = 2000;

export const GameMap = () => {
  const draw = useCallback((g: any) => {
    g.clear();
    g.beginFill(0x111111);
    g.drawRect(0, 0, MAP_SIZE, MAP_SIZE);
    g.endFill();

    // グリッド線
    g.lineStyle(1, 0x333333);
    for (let i = 0; i <= MAP_SIZE; i += 100) {
      g.moveTo(i, 0).lineTo(i, MAP_SIZE);
      g.moveTo(0, i).lineTo(MAP_SIZE, i);
    }

    // 外枠
    g.lineStyle(5, 0xff4444);
    g.drawRect(0, 0, MAP_SIZE, MAP_SIZE);
  }, []);

  return <Graphics draw={draw} />;
};