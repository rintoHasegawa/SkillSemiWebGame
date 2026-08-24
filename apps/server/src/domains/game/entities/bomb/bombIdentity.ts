/**
 * bombIdentity
 * 爆弾ID採番ロジックを提供する
 */
import { randomUUID } from "node:crypto";

type IssueServerBombIdParams = {
  currentSerial: number;
};

/**
 * 次のサーバー採番爆弾IDと更新後シリアルを返す
 * 爆弾IDは推測による偽装被弾報告を防ぐためUUIDとし，連番は設置数の
 * カウンタとしてのみ進める
 */
export const issueServerBombId = ({
  currentSerial,
}: IssueServerBombIdParams): { bombId: string; nextSerial: number } => {
  const nextSerial = currentSerial + 1;
  return {
    bombId: randomUUID(),
    nextSerial,
  };
};
