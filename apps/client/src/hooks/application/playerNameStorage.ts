/**
 * playerNameStorage
 * プレイヤー名を localStorage へ永続化する読み書き処理を提供する
 * 保存領域が使えない環境（Safari のプライベートモード等）ではフォールバックして継続する
 */
import { domain } from "@repo/shared";

/** プレイヤー名の保存に使う localStorage のキー */
export const PLAYER_NAME_STORAGE_KEY = "ppw:player-name";

// 保存・復元する値をルーム参加時の入力制約に合わせて切り詰める
const clampPlayerName = (name: string): string => {
  return name.slice(0, domain.room.PLAYER_NAME_MAX_LENGTH);
};

/** 保存済みのプレイヤー名を読み出す（未保存・参照失敗時は空文字） */
export const loadPlayerName = (): string => {
  try {
    const storedName = globalThis.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);

    if (storedName === null) {
      return "";
    }

    return clampPlayerName(storedName);
  } catch {
    // 参照できない環境では未入力として扱い，タイトルでの再入力に委ねる
    return "";
  }
};

/** プレイヤー名を保存する（保存失敗時はログを残して継続する） */
export const savePlayerName = (name: string): void => {
  try {
    globalThis.localStorage.setItem(
      PLAYER_NAME_STORAGE_KEY,
      clampPlayerName(name),
    );
  } catch (error) {
    console.error("[playerNameStorage] プレイヤー名の保存に失敗しました", error);
  }
};
