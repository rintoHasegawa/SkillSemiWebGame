/**
 * MiniMapPanel
 * ミニマップの開閉操作と表示を担うプレゼンテーションコンポーネント
 * 全体マップ枠とローカルプレイヤー現在地のみを描画する
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "@client/config";
import {
  buildMiniMapDotStyle,
  MINIMAP_CANVAS_STYLE,
  buildMiniMapToggleButtonStyle,
  MINIMAP_FRAME_STYLE,
  MINIMAP_PANEL_ROOT_STYLE,
} from "./MiniMapPanel.styles";

const MINIMAP_FRAME_SIZE_PX = 128;

/** ミニマップの入力プロパティ */
export type MiniMapPanelProps = {
  miniMapTeamIds: number[];
  localPlayerPosition: { x: number; y: number } | null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

/** 全体マップ上のローカル位置を示すミニマップを描画する */
export const MiniMapPanel = ({
  miniMapTeamIds,
  localPlayerPosition,
}: MiniMapPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleToggle();
  };

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
    const cellWidth = MINIMAP_FRAME_SIZE_PX / cols;
    const cellHeight = MINIMAP_FRAME_SIZE_PX / rows;

    context.clearRect(0, 0, MINIMAP_FRAME_SIZE_PX, MINIMAP_FRAME_SIZE_PX);

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
  }, [isOpen, miniMapTeamIds]);

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
      leftPx: normalizedX * MINIMAP_FRAME_SIZE_PX,
      topPx: normalizedY * MINIMAP_FRAME_SIZE_PX,
    };
  }, [localPlayerPosition]);

  const buttonStyle = buildMiniMapToggleButtonStyle(isOpen);

  return (
    <div style={MINIMAP_PANEL_ROOT_STYLE}>
      <button
        type="button"
        style={buttonStyle}
        onPointerDown={handlePointerDown}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {isOpen ? "閉じる" : "ミニマップ"}
      </button>

      {isOpen && (
        <div style={MINIMAP_FRAME_STYLE}>
          <canvas
            ref={canvasRef}
            width={MINIMAP_FRAME_SIZE_PX}
            height={MINIMAP_FRAME_SIZE_PX}
            style={MINIMAP_CANVAS_STYLE}
          />
          {markerPosition && (
            <div
              style={buildMiniMapDotStyle(
                markerPosition.leftPx,
                markerPosition.topPx,
              )}
            />
          )}
        </div>
      )}
    </div>
  );
};
