/**
 * BombButton
 * presentation配下のBombButtonを段階移行のため再公開する
 * 既存import互換を維持して段階的な参照置換を可能にする
 */

/** presentation配下の型を互換再エクスポートする */
export type { BombButtonProps } from "./presentation/BombButton";

/** presentation配下のコンポーネントを互換再エクスポートする */
export { BombButton } from "./presentation/BombButton";
