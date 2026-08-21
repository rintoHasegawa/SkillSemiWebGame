/**
 * dedupeKeyEncoding
 * 重複排除テーブル用キーの衝突しない連結方式を提供する
 * サーバー内部のMapキー専用で，ネットワークへは送出しない
 */

/**
 * 各セグメントに長さプレフィックスを付けて連結し，一意なキーを生成する
 * 区切り文字を含むID（`bot:room-1:1` 等）でも別セグメントと衝突しない
 */
export const joinDedupeKeySegments = (...segments: string[]): string => {
  return segments.map((segment) => `${segment.length}:${segment}`).join("|");
};
