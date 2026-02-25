import type { GameResultPayload } from "@repo/shared";

type Props = {
  result: GameResultPayload | null;
};

const formatPaintRate = (value: number): string => `${value.toFixed(1)}%`;

export const ResultScene = ({ result }: Props) => {
  if (!result) {
    return <div style={{ color: "white", padding: 40 }}>結果を読み込み中...</div>;
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        background: "#111",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ margin: "0 0 20px 0", fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>結果発表</h2>

      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          border: "1px solid #444",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 180px",
            background: "#222",
            padding: "12px 16px",
            fontWeight: "bold",
          }}
        >
          <span>順位</span>
          <span>チーム名</span>
          <span style={{ textAlign: "right" }}>塗り率</span>
        </div>

        {result.rankings.map((row, index) => (
          <div
            key={`${row.teamId}-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 180px",
              padding: "12px 16px",
              borderTop: "1px solid #333",
              background: index % 2 === 0 ? "#171717" : "#1d1d1d",
            }}
          >
            <span>{row.rank}位</span>
            <span>{row.teamName}</span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {formatPaintRate(row.paintRate)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
