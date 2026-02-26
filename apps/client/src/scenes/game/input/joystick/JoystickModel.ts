/**
 * JoystickModel
 * model配下のJoystickModelを段階移行のため再公開する
 * 既存import互換を維持して段階的な参照置換を可能にする
 */

/** model配下の型を互換再エクスポートする */
export type { JoystickComputed } from "./model/JoystickModel";

/** model配下の関数を互換再エクスポートする */
export { computeJoystick } from "./model/JoystickModel";
