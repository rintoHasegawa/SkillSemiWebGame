---
paths: ["apps/client/src/**", "apps/server/src/**", "packages/shared/src/**", "test/**"]
---

# コーディング規約 (Coding Style)

TypeScript / React のソースを作成・編集するときは必ず本ルールに従うこと．本規約は既存コードの実態から起こしており，既存コードと矛盾した場合は本規約を優先する（既存コードの一括修正はしない）．

## フォーマット (Formatting)

- インデント: 2 スペース（タブ禁止）
- クォート: ダブルクォート `"` を使用する
- セミコロン: 必ず付ける
- 行長: 80 桁を目安に折り返す
- アロー関数の引数: 単一引数でも括弧を付ける（`(x) => ...`）

## 命名規則 (Naming)

### ファイル名

- `class` を export するファイル・単一責務のモジュール: PascalCase（`ClockSyncService.ts`）
- 関数群・ユーティリティ: camelCase（`placeBombUseCase.ts`）
- React コンポーネント: PascalCase + `.tsx`（`LobbyRuleModal.tsx`）
- フック: `useXxx.ts`（`useJoystickState.ts`）
- スタイル定数: `<コンポーネント名>.styles.ts`

### 識別子

- 定数（設定値・数値・スタイル）: SCREAMING_SNAKE（`GAME_CONFIG`，`BOMB_COOLDOWN_MS`）
- enum 代替の定数オブジェクト: PascalCase（`RoomPhase`，`SocketEvents`）
- boolean: `is` / `has` / `should` / `can` を前置する（`isMoving`，`canPlaceBomb`）
- 単位を持つ値: サフィックスで単位を明示する（`receivedAtMs`，`PLAYER_RADIUS_PX`，`~_MS`）
- React の ref: `~Ref`，イベントハンドラ: `handle~`，props コールバック: `on~`，ファクトリ関数: `create~`
- 型名: PascalCase．用途に応じたサフィックスを使う（`~Payload` / `~Port` / `~Props` / `~Params` / `~Options` / `~Deps` / `~Result` / `~Config` / `~State`）．フック戻り値は `Use~Return`

## import 規則 (Imports)

- 並び順: 外部ライブラリ → `@repo/shared` → エイリアス（`@client/` / `@server/`）→ 相対パス
- エイリアスは上の階層へ遡る場合のみ使用し，同階層以下は相対パスで書く（ESLint の `prefer-relative-for-local-*-path` で警告される）
- 型のみを参照する場合は `import type` で分離する．値と型を同一モジュールから import する場合はインライン `type` 修飾（`import { x, type Y }`）でよい

## 型の使い方 (Types)

- `type` を基本とする．`interface` は「メソッドを持つ Port 契約」（`application/ports/`）にのみ使用する
- `enum` は使用しない．`as const` オブジェクト＋ `keyof typeof` 派生型で代替する

  ```ts
  export const RoomPhase = { WAITING: "waiting", ... } as const;
  export type RoomPhaseType = (typeof RoomPhase)[keyof typeof RoomPhase];
  ```

- 型制約付きの定数オブジェクトには `satisfies` を使用する
- `any`・`@ts-ignore`・`@ts-expect-error`・`eslint-disable` は禁止する（現状 0 件を維持する）．外部入力は `unknown` で受けて型ガードで絞る
- 状態の分岐は判別可能ユニオン（`status` / リテラルユニオン）で表現する
- 型の置き場所: 1 ファイル内で完結する型（Props・Params 等）は実装ファイルに同居させ，複数ファイルで共有する型のみ分離する（分離時の命名は各パッケージの既存方式に合わせる）

## 関数・エクスポート (Functions & Exports)

- `export const xxx = () => {}`（アロー関数）を標準とする．`function` 宣言は使わない
- named export を原則とし，default export は使用しない（既存の `app.tsx`・`vite.config.ts` のみ例外）
- React コンポーネントは `export const X = ({ a, b }: XProps) => ...` の形とする．`React.FC`・`JSX.Element` 注釈は使わない
- クラスメンバは `public` / `private` / `readonly` を明示する．public メソッドには戻り値型を明示する
- 引数が 3 つを超える場合はオブジェクト引数（`XxxParams` 型）に切り替える

## コメント規則 (Comments)

- 言語: 日本語．句読点は「，」を使用し，文末の句点（「．」「。」）は付けない
- 文体: 体言止め，または「〜する」形で統一する

### ファイルドキュメント (File Header Doc Comment)

ファイルの先頭に必ず JSDoc 形式（`/** */`）で記述する．

```ts
/**
 * useJoystick
 * ジョイスティック入力を受け取り，座標計算と正規化ベクトルの出力を行うフック
 * UI描画に必要な中心点・ノブ位置・半径も合わせて提供する
 */
```

### 型・定数・関数ドキュメント (Doc Comments)

`export` される型・定数・関数・コンポーネント・フックには，JSDoc 形式の 1 行コメントを直前行に必ず記述する．

```ts
/** UI側と共有する最大半径の既定値 */
export const MAX_DIST = 60;

/** 正規化ベクトルの出力とUI用の座標を提供するフック */
export const useJoystick = ...
```

### ブロックコメント・JSXコメント (Block & JSX Comments)

- 関数内で処理のまとまりが変わる箇所に行コメント（`//`）を記述する
- JSX 内のブロック区切りには `{/* */}` 形式を使用する

```ts
// 入力座標からベクトルを計算し，半径でクランプして正規化出力する
const handleMove = ...
```

### 再エクスポートコメント (Re-export Comment)

外部へ再公開する `export { ... }` には 1 行ドキュメントを付ける．

```ts
/** 入力半径の既定値を外部から参照できるように再公開 */
export { MAX_DIST } from "./useJoystick";
```

### 省略してよい場合 (When to Omit)

- ファイル内部でのみ使用し，外部に公開されない型・関数・定数
- コード自体が自明な場合（変数名で意図が十分伝わる場合）
- ユニットテストファイルで，テストケース名で意図が伝わる場合

### NG例 (Anti-patterns)

- 句点を付ける（NG: `/** 入力を受け取る． */` → OK: `/** 入力を受け取る */`）
- 「、」「。」を使う
- ファイルヘッダーを通常の行コメント（`//`）で書く
