# テスト整備計画 (Test Coverage Plan)

Issue #289「現行仕様を固定するテストの整備」の拡張計画である．Issue の当初範囲（shared domains・server useCases/services）完了後，リポジトリ全体の未テストロジックを棚卸しし，残りを本計画のステップに沿って整備する．

## 方針 (Policy)

- テストの種類・配置・粒度・モック方針は [testing ルール](../../.claude/rules/testing.md) に従う．
- **characterization test** とする．挙動が仕様として正しいかは判断せず，現行実装の出力をそのまま固定する．疑わしい挙動は修正せず別 Issue に起票する（Issue #289 の方針を継承）．
- 1 ステップ = tester エージェント 1 回 = コミット 1 個とし，各ステップ完了時に全テスト緑を確認してからコミットする．
- 対象外: bootstrap・handler 登録等の配線コード，`logging/`，Pixi/React コンポーネント（人間の動作確認で担保），型定義のみのファイル．

## 完了済み (Done)

| 領域 | テスト |
| --- | --- |
| shared `domains/`（player 移動・gridMap・bombHit・aoi） | 117 件 |
| server `useCases/`（game 8＋room 2，`status` 全分岐） | 81 件 |
| server `services/`（game 6＋room 8＋bot 7 ファイル） | 231 件 |

## 残りステップ (Remaining Steps)

| # | 対象 | 主なファイル | 状態 |
| --- | --- | --- | --- |
| 1 | server `entities/bomb`（7） | ActiveBombRegistry・bombDedup・bombHitReport・bombIdentity・bombPayloadValidation・bombPlacement・BombStateStore | 完了（135 件） |
| 2 | server `entities/map`（4） | mapContestResolver・mapGrid・mapPainting・MapStore | 未着手 |
| 3 | server `entities/player`（4） | playerMovement・playerPosition・playerSpawn・Player | 未着手 |
| 4 | server `loop/`（5） | HurricaneHitService・HurricaneMotionService・HurricaneSyncService・HurricaneSystem・GameLoop（テスト可能な範囲） | 未着手 |
| 5 | server `network/` 純ロジック（約 10） | socketPayloadValidators・payloadGuard・gamePayloadSanitizers・aoiVisibility・bombSyncService・hurricaneSyncService・playerSyncService・roomViewerSyncContext・realtimeRoomSyncState・syncDelta | 未着手 |
| 6 | server 残り | coordinators（5）・BotTurnOrchestrator | 未着手 |
| 7 | shared 残り | config/teamValidators・protocol のランタイムロジック（bombIdentity・socketEventBridge 等） | 未着手 |
| 8 | client 純ロジック | Vitest 導入＋appFlowReducer・time 系（ClockSyncService・SyncIntervalPolicy 等）・sync handler 系・culling | 未着手 |

## 進捗の更新 (Progress Tracking)

各ステップ完了時に本表の「状態」を更新する（未着手 → 完了（テスト件数））．テスト作成中に見つかった疑わしい挙動は，計画完了時にまとめて別 Issue に起票する．
