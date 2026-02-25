/**
 * ResultScene
 * ゲーム終了後の順位一覧を表示する結果画面コンポーネント
 * 順位，チーム名，塗り率の3項目をテーブル形式で描画する
 */
import type { GameResultPayload } from "@repo/shared";
import type { CSSProperties } from "react";

type Props = {
  result: GameResultPayload | null;
};

const formatPaintRate = (value: number): string => `${value.toFixed(1)}%`;

const ROW_GRID_TEMPLATE = "120px 1fr 180px";

const ROOT_STYLE: CSSProperties = {
  width: "100vw",
  height: "100dvh",
  background: "#111",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "24px",
  boxSizing: "border-box",
};

const TITLE_STYLE: CSSProperties = {
  margin: "0 0 20px 0",
  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
};

const TABLE_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "720px",
  border: "1px solid #444",
  borderRadius: "8px",
  overflow: "hidden",
};

const HEADER_ROW_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: ROW_GRID_TEMPLATE,
  background: "#222",
  padding: "12px 16px",
  fontWeight: "bold",
};

const RIGHT_ALIGN_STYLE: CSSProperties = { textAlign: "right" };

const RATE_STYLE: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const getBodyRowStyle = (index: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: ROW_GRID_TEMPLATE,
  padding: "12px 16px",
  borderTop: "1px solid #333",
  background: index % 2 === 0 ? "#171717" : "#1d1d1d",
});

/** 最終結果データを受け取り，順位一覧を表示する */
export const ResultScene = ({ result }: Props) => {
  if (!result) {
    return <div style={{ color: "white", padding: 40 }}>結果を読み込み中...</div>;
  }

  return (
    <div style={ROOT_STYLE}>
      <h2 style={TITLE_STYLE}>結果発表</h2>

      <div style={TABLE_STYLE}>
        <div style={HEADER_ROW_STYLE}>
          <span>順位</span>
          <span>チーム名</span>
          <span style={RIGHT_ALIGN_STYLE}>塗り率</span>
        </div>

        {result.rankings.map((row, index) => (
          <div key={`${row.teamId}-${index}`} style={getBodyRowStyle(index)}>
            <span>{row.rank}位</span>
            <span>{row.teamName}</span>
            <span style={RATE_STYLE}>
              {formatPaintRate(row.paintRate)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
