/**
 * joystick.constants
 * ジョイスティック入力に関する定数をまとめる
 * 共有する半径の既定値などを定義する
 */

/** UI側と共有する最大半径の既定値 */
export const MAX_DIST = 60;

/** 微小入力をゼロ扱いにするデッドゾーン閾値 */
export const JOYSTICK_DEADZONE = 0.08;

/** 連続送信を間引く最小移動量閾値 */
export const JOYSTICK_MIN_MOVEMENT_DELTA = 0.02;

/** 入力終了時にゼロ入力を送信するかどうかの方針 */
export const JOYSTICK_SEND_ZERO_ON_END = true;

/** ジョイスティックベースの背景色 */
export const JOYSTICK_BASE_BG_COLOR = 'rgba(255, 255, 255, 0.1)';

/** ジョイスティックベースの枠線色 */
export const JOYSTICK_BASE_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';

/** ジョイスティックベースの枠線太さ */
export const JOYSTICK_BASE_BORDER_WIDTH = 2;

/** ジョイスティックノブのサイズ */
export const JOYSTICK_KNOB_SIZE = 40;

/** ジョイスティックノブの背景色 */
export const JOYSTICK_KNOB_BG_COLOR = 'rgba(255, 255, 255, 0.8)';

/** ジョイスティックノブの影 */
export const JOYSTICK_KNOB_SHADOW = '0 0 10px rgba(0,0,0,0.5)';
