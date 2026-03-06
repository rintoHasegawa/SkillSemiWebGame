/**
 * lobbyRuleContent
 * ロビーのルール表示で使う短文テキストを定義する
 */
import { config } from "@client/config";

/** ルール画面の短文セクション */
export type LobbyRuleSection = {
  id: "controls" | "hits" | "win";
  title: string;
  lines: string[];
};

/** ロビーに表示するルール内容を組み立てる */
export const buildLobbyRuleSections = (
  respawnHitCount: number,
): LobbyRuleSection[] => {
  return [
    {
      id: "controls",
      title: "操作",
      lines: ["左で移動", "右下で爆弾設置"],
    },
    {
      id: "hits",
      title: "被弾",
      lines: ["被弾でその場ステイ", `${respawnHitCount}回で初期位置へ戻る`],
    },
    {
      id: "win",
      title: "勝利",
      lines: ["制限時間終了時に塗り面積が最も高いチームが勝利"],
    },
  ];
};

/** ロビーに表示するルール内容 */
export const LOBBY_RULE_SECTIONS: LobbyRuleSection[] = buildLobbyRuleSections(
  config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT,
);
