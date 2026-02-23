/**
 * joystick.types
 * ジョイスティック入力で使う型をまとめる
 * 座標や入力の共通表現を定義する
 */

/** 2D座標の簡易型 */
export type Point = { x: number; y: number };

/** 正規化された入力ベクトル */
export type NormalizedInput = { x: number; y: number };
