---
paths: ["packages/shared/src/config/**"]
---

# ゲーム定数変更時のSPEC更新 (Game Config & Spec Sync)

`packages/shared/src/config/gameConfig.ts` の定数値を変更した場合は，`docs/04_SPEC/` 配下の対応する仕様書を合わせて更新すること．

## 対象 (Scope)

- `GAME_CONFIG` 内の時間・距離・回数などの数値定数

## 特に影響が大きいファイル (Impacted Specs)

- `docs/04_SPEC/SPEC_03_ゲームプレイ仕様.md` — 制限時間，ボム・ハリケーン・被弾の各パラメータ
- `docs/04_SPEC/SPEC_04_HUD_UI仕様.md` — 表示切替のしきい値，クールダウン時間

## 参照 (Reference)

- 設定値（config）の配置ルールと定数一覧は `packages/shared/src/config/README.md` を参照する．
