/**
 * bombIdentity
 * 爆弾ID採番ロジックを提供する
 */

type IssueServerBombIdParams = {
  roomId: string;
  currentSerial: number;
};

/** 次のサーバー採番爆弾IDと更新後シリアルを返す */
export const issueServerBombId = ({
  roomId,
  currentSerial,
}: IssueServerBombIdParams): { bombId: string; nextSerial: number } => {
  const nextSerial = currentSerial + 1;
  return {
    bombId: `${roomId}:${nextSerial}`,
    nextSerial,
  };
};
