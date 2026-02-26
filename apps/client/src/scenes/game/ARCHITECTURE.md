# Game Scene Architecture

## レイヤー定義
- `GameScene.tsx` と `GameView.tsx` はシーンUI層
- `hooks/` と `input/` と `styles/` はプレゼンテーション層
- `application/` はユースケースとオーケストレーション層
- `entities/` はドメインモデルと描画エンティティ層

## 依存方向
- シーンUI層はプレゼンテーション層と application層へ依存可能
- プレゼンテーション層は application層へ依存可能
- application層は entities層へ依存可能
- entities層は application層の抽象型へ依存可能

## 禁止依存
- application層 -> hooks層
- application層 -> input層
- application層 -> styles層
- application層 -> シーンUI層
- entities層 -> hooks層
- entities層 -> input層
- entities層 -> styles層
- entities層 -> シーンUI層

## 運用方針
- 依存方向違反は `eslint.config.mjs` の `no-restricted-imports` で検出する
- 新規ファイル追加時はまずどのレイヤーへ属するかを決めてから配置する
- 依存方向をまたぐ必要がある場合は application層へ adapter を追加して橋渡しする
