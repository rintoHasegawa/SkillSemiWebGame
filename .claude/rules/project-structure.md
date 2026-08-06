---
paths: ["apps/client/src/**", "apps/server/src/**", "packages/shared/src/**"]
---

# アーキテクチャ・配置ルール (Project Structure Rules)

client / server / shared のソースを編集するときは必ず以下に従うこと．各パッケージ内のディレクトリ構成の詳細は `docs/02_ENV/ENV_07_ディレクトリ構造.md` を参照する．

## ロジックの一元管理 (Single Source of Logic)

- 「移動速度」「ヒット判定」「マップ更新」の計算式は必ず `packages/shared` に記述する．
- Client と Server で別の計算式を書くことを禁止する（同期ズレ防止）．

## 座標系 (Coordinate System)

- 内部計算: Float（浮動小数点）
- 通信データ: Integer（整数．100倍して送信など圧縮を考慮）
- 描画: Float（補間処理あり）

## 依存方向 (Dependency Direction)

- OK: Client → Shared
- OK: Server → Shared
- NG: Client → Server / Server → Client（直接参照禁止）

## 通信境界の責務分離 (Network Boundary Responsibilities)

- SocketEvents の解決（イベント名の参照）は `apps/server/src/network` 配下に集約する．
- `apps/server/src/domains` 配下では `protocol` を直接 import せず，意味名の Publisher 関数を受け取って利用する．
- Socket の接続制御・受信イベント登録・切断順序制御は network 層が担当し，業務ロジック判断は domain 層が担当する．
- client 側も同様に，`scenes/` 内から直接 `protocol` を参照せず `network/` 層を経由する．
