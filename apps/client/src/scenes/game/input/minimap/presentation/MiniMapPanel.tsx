/**
 * MiniMapPanel
 * ミニマップの開閉操作と表示を担うプレゼンテーションコンポーネント
 * 全体マップ枠とローカルプレイヤー現在地のみを描画する
 */
import { useState } from "react";
import {
  buildMiniMapDotStyle,
  MINIMAP_CANVAS_STYLE,
  buildMiniMapToggleButtonStyle,
  MINIMAP_FRAME_STYLE,
  MINIMAP_PANEL_ROOT_STYLE,
} from "./MiniMapPanel.styles";
import { useMiniMapCanvas } from "@client/scenes/game/input/minimap/hooks/useMiniMapCanvas";
import { MINIMAP_UI_CONFIG } from "./minimapUiConfig";
import { useImmediatePressHandlers } from "@client/scenes/game/input/presentation/useImmediatePressHandlers";

/** ミニマップの入力プロパティ */
export type MiniMapPanelProps = {
  miniMapTeamIds: number[];
  localPlayerPosition: { x: number; y: number } | null;
};

/** 全体マップ上のローカル位置を示すミニマップを描画する */
export const MiniMapPanel = ({
  miniMapTeamIds,
  localPlayerPosition,
}: MiniMapPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };
  const { onPointerDown, onClick, onKeyDown, onKeyUp } =
    useImmediatePressHandlers<HTMLButtonElement>(handleToggle);
  const { canvasRef, markerPosition } = useMiniMapCanvas({
    isOpen,
    frameSizePx: MINIMAP_UI_CONFIG.FRAME_SIZE_PX,
    miniMapTeamIds,
    localPlayerPosition,
  });

  const buttonStyle = buildMiniMapToggleButtonStyle(isOpen);

  return (
    <div style={MINIMAP_PANEL_ROOT_STYLE}>
      <button
        type="button"
        style={buttonStyle}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        {isOpen ? "閉じる" : "ミニマップ"}
      </button>

      {isOpen && (
        <div style={MINIMAP_FRAME_STYLE}>
          <canvas
            ref={canvasRef}
            width={MINIMAP_UI_CONFIG.FRAME_SIZE_PX}
            height={MINIMAP_UI_CONFIG.FRAME_SIZE_PX}
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
