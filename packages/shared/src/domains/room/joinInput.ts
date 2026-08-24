/**
 * joinInput
 * ルーム参加入力（roomId / playerName）の受け入れ条件を集約する
 * client の入力欄制限と server の受信検証で同じ判定を共有し，判定のズレを防ぐ
 */

/**
 * ルームIDの最大長（UTF-16コードユニット数）
 * HTML input 要素の maxLength 属性と同じ String.prototype.length 基準とし，
 * client で入力できた値が server で弾かれる／その逆が起きないようにする
 */
export const ROOM_ID_MAX_LENGTH = 32;

/**
 * プレイヤー名の最大長（UTF-16コードユニット数）
 * HTML input 要素の maxLength 属性と同じ String.prototype.length 基準とし，
 * client で入力できた値が server で弾かれる／その逆が起きないようにする
 */
export const PLAYER_NAME_MAX_LENGTH = 32;

/**
 * 受け入れない文字のパターン
 * 日本語・絵文字を巻き込まないため許可リスト方式は採らず，
 * 制御文字（Cc）・書式文字（Cf）・行区切り（Zl/Zp）・単独サロゲートのみを弾く
 * 拒否リスト方式とする
 * ZWJ（U+200D）は絵文字連結（家族絵文字・虹旗）に必要なため例外的に許可する
 * 狙いはログ改行注入と不可視文字による名前偽装の防止
 */
const FORBIDDEN_CHAR_PATTERN =
  /(?!\u200D)[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\uD800-\uDFFF]/u;

// 前後空白を除いた値が「非空」「最大長以内」「禁止文字を含まない」を満たすか判定する
// server の joinRoomUseCase が trim 後の値を使うため，判定も trim 後の値に揃える
const isAcceptableJoinInput = (value: string, maxLength: number): boolean => {
  const trimmed = value.trim();

  return (
    trimmed.length > 0
    && trimmed.length <= maxLength
    && !FORBIDDEN_CHAR_PATTERN.test(trimmed)
  );
};

/** ルームIDがルーム参加で受け入れ可能な値かを判定する */
export const isValidRoomId = (value: string): boolean => {
  return isAcceptableJoinInput(value, ROOM_ID_MAX_LENGTH);
};

/** プレイヤー名がルーム参加で受け入れ可能な値かを判定する */
export const isValidPlayerName = (value: string): boolean => {
  return isAcceptableJoinInput(value, PLAYER_NAME_MAX_LENGTH);
};
