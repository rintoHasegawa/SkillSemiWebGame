/**
 * MiniMapPanel
 * ミニマップの開閉操作と表示を担うプレゼンテーションコンポーネント
 * 全体マップ枠とローカルプレイヤー現在地のみを描画する
 */
import { useMemo, useState } from "react";
import { config } from "@client/config";
import {
  buildMiniMapDotStyle,
  buildMiniMapToggleButtonStyle,
  MINIMAP_FRAME_STYLE,
  MINIMAP_PANEL_ROOT_STYLE,
} from "./MiniMapPanel.styles";

const MINIMAP_FRAME_SIZE_PX = 128;

/** ミニマップの入力プロパティ */
export type MiniMapPanelProps = {
  localPlayerPosition: { x: number; y: number } | null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

/** 全体マップ上のローカル位置を示すミニマップを描画する */
export const MiniMapPanel = ({ localPlayerPosition }: MiniMapPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const markerPosition = useMemo(() => {
    if (!localPlayerPosition) {
      return null;
    }

    const width = config.GAME_CONFIG.MAP_WIDTH_PX;
    const height = config.GAME_CONFIG.MAP_HEIGHT_PX;
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
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
      >
        {isOpen ? "閉じる" : "ミニマップ"}
      </button>

      {isOpen && (
        <div style={MINIMAP_FRAME_STYLE}>
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
