import { useCallback } from "react";
import { Graphics } from "@pixi/react";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

export const GameMap = () => {
  const draw = useCallback((g: any) => {
    const { MAP_WIDTH, MAP_HEIGHT } = GAME_CONFIG;

    g.clear();
    // 背景
    g.beginFill(0x111111);
    g.drawRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    g.endFill();

    // グリッド線
    g.lineStyle(1, 0x333333);
    // 垂直線
    for (let x = 0; x <= MAP_WIDTH; x += 100) {
      g.moveTo(x, 0).lineTo(x, MAP_HEIGHT);
    }
    // 水平線
    for (let y = 0; y <= MAP_HEIGHT; y += 100) {
      g.moveTo(0, y).lineTo(MAP_WIDTH, y);
    }

    // 外枠
    g.lineStyle(5, 0xff4444);
    g.drawRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }, []);

  return <Graphics draw={draw} />;
};