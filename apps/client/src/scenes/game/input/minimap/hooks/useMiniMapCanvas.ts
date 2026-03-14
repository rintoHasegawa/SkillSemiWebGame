/**
 * useMiniMapCanvas
 * ミニマップのキャンバス描画と現在地ドット座標計算を担うフック
 * グリッド配列を描画し，ローカルプレイヤー位置をピクセルへ変換する
 */
import { useEffect, useMemo, useRef } from "react";
import { config } from "@client/config";

/** ミニマップ描画フックの入力プロパティ */
export type UseMiniMapCanvasProps = {
  isOpen: boolean;
  frameSizePx: number;
  miniMapTeamIds: number[];
  localPlayerPosition: { x: number; y: number } | null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

/** キャンバス描画と現在地ドット座標を提供するフック */
export const useMiniMapCanvas = ({
  isOpen,
  frameSizePx,
  miniMapTeamIds,
  localPlayerPosition,
}: UseMiniMapCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const cols = config.GAME_CONFIG.GRID_COLS;
    const rows = config.GAME_CONFIG.GRID_ROWS;
    const totalCells = cols * rows;
    const cellWidth = frameSizePx / cols;
    const cellHeight = frameSizePx / rows;

    context.clearRect(0, 0, frameSizePx, frameSizePx);

    for (let index = 0; index < totalCells; index += 1) {
      const teamId = miniMapTeamIds[index] ?? -1;
      if (teamId < 0 || teamId >= config.GAME_CONFIG.TEAM_COLORS.length) {
        continue;
      }

      const col = index % cols;
      const row = Math.floor(index / cols);
      context.fillStyle = config.GAME_CONFIG.TEAM_COLORS[teamId] ?? "#000000";
      context.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
    }
  }, [frameSizePx, isOpen, miniMapTeamIds]);

  const markerPosition = useMemo(() => {
    if (!localPlayerPosition) {
      return null;
    }

    const width = config.GAME_CONFIG.GRID_COLS;
    const height = config.GAME_CONFIG.GRID_ROWS;
    if (width <= 0 || height <= 0) {
      return null;
    }

    const normalizedX = clamp(localPlayerPosition.x / width, 0, 1);
    const normalizedY = clamp(localPlayerPosition.y / height, 0, 1);

    return {
      leftPx: normalizedX * frameSizePx,
      topPx: normalizedY * frameSizePx,
    };
  }, [frameSizePx, localPlayerPosition]);

  return {
    canvasRef,
    markerPosition,
  };
};
