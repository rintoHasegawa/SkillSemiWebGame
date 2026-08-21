/**
 * index
 * bomb サブドメインの公開要素を集約して再公開する
 * 爆弾設置の共通ルールを外部利用向けに束ねる
 */

/** 爆弾クールダウン時間の解決関数を再公開する */
export { resolveBombCooldownMs } from "./bombCooldown";
