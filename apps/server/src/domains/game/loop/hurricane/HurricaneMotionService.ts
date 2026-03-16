/**
 * HurricaneMotionService
 * ハリケーンの移動と境界反射を担当する
 */
import { config } from "@server/config";
import type { HurricaneState, MapGridSize } from "./hurricaneTypes.js";

/** ハリケーン移動ロジックを提供する */
export class HurricaneMotionService {
  constructor(private readonly mapSize: MapGridSize) {}

  /** ハリケーンを直線移動させ，境界で反射させる */
  public update(hurricanes: HurricaneState[], deltaSec: number): void {
    if (hurricanes.length === 0) {
      return;
    }

    const maxX = this.mapSize.gridCols;
    const maxY = this.mapSize.gridRows;

    hurricanes.forEach((hurricane) => {
      hurricane.x += hurricane.vx * deltaSec;
      hurricane.y += hurricane.vy * deltaSec;
      hurricane.rotationRad +=
        config.GAME_CONFIG.HURRICANE_VISUAL_ROTATION_SPEED * deltaSec;

      if (hurricane.x - hurricane.radius < 0) {
        hurricane.x = hurricane.radius;
        hurricane.vx *= -1;
      } else if (hurricane.x + hurricane.radius > maxX) {
        hurricane.x = maxX - hurricane.radius;
        hurricane.vx *= -1;
      }

      if (hurricane.y - hurricane.radius < 0) {
        hurricane.y = hurricane.radius;
        hurricane.vy *= -1;
      } else if (hurricane.y + hurricane.radius > maxY) {
        hurricane.y = maxY - hurricane.radius;
        hurricane.vy *= -1;
      }
    });
  }
}
