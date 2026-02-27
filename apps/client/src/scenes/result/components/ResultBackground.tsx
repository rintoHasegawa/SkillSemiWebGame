/**
 * ResultBackground
 * リザルト画面の背景演出を表示する
 * 最終マップと優勝チーム色の紙吹雪を描画する
 */
import {
  RESULT_CONFETTI_COUNT,
  RESULT_CONFETTI_LAYER_STYLE,
  RESULT_MAP_BACKGROUND_LAYER_STYLE,
  getResultConfettiStyle,
  getResultMapCellStyle,
  getResultMapWrapperStyle,
} from "../styles/resultStyles";

type Props = {
  gridCols: number;
  gridRows: number;
  finalGridColors: number[];
  winnerColor: string;
};

/** 背景マップと紙吹雪を描画するコンポーネント */
export const ResultBackground = ({
  gridCols,
  gridRows,
  finalGridColors,
  winnerColor,
}: Props) => {
  return (
    <>
      <div style={RESULT_MAP_BACKGROUND_LAYER_STYLE}>
        <div style={getResultMapWrapperStyle(gridCols, gridRows)}>
          {finalGridColors.map((teamId, index) => (
            <span
              key={`result-map-cell-${index}`}
              style={getResultMapCellStyle(teamId)}
            />
          ))}
        </div>
      </div>

      <div style={RESULT_CONFETTI_LAYER_STYLE}>
        {Array.from({ length: RESULT_CONFETTI_COUNT }, (_, index) => (
          <span
            key={`confetti-${index}`}
            style={getResultConfettiStyle(index, winnerColor)}
          />
        ))}
      </div>
    </>
  );
};
