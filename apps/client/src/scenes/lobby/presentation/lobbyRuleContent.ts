/**
 * lobbyRuleContent
 * ロビーのルール表示で使う短文テキストを定義する
 */

/** ルール画面の短文セクション */
export type LobbyRuleSection = {
  title: string;
  lines: string[];
};

/** ロビーに表示するルール内容 */
export const LOBBY_RULE_SECTIONS: LobbyRuleSection[] = [
  {
    title: "操作",
    lines: ["左で移動", "右下で爆弾設置"],
  },
  {
    title: "被弾",
    lines: ["被弾でその場ステイ", "一定回数で初期位置へ戻る"],
  },
  {
    title: "勝利",
    lines: ["制限時間終了時に塗り面積が最も高いチームが勝利"],
  },
];
