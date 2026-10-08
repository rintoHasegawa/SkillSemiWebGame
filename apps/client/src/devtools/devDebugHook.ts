/**
 * devDebugHook
 * 開発モードのブラウザで window へデバッグフックを公開する窓口
 * 初回登録時にだけ公開し，以後は同じレジストリへ供給元を差し替える
 * 本番ビルドから除外するため，呼び出しは必ず import.meta.env.MODE !== "production" の分岐内に置く
 * （NODE_ENV=development の環境で vite build すると DEV が true になるため DEV では判定しない）
 */
import {
  createDebugStateRegistry,
  installDebugHook,
  type DebugAppState,
  type DebugGameState,
  type DebugStateProvider,
  type DebugStateRegistry,
} from "./debugHook";

// モジュール読み込み時に副作用を持たせず，未使用時に tree-shake されるよう遅延生成する
let registry: DebugStateRegistry | null = null;

const ensureRegistry = (): DebugStateRegistry => {
  if (registry) {
    return registry;
  }

  registry = createDebugStateRegistry();
  installDebugHook(window, registry);
  return registry;
};

/** アプリフローの状態供給元を登録し，登録解除関数を返す */
export const registerDebugAppSource = (
  provider: DebugStateProvider<DebugAppState>,
): (() => void) => {
  return ensureRegistry().setAppSource(provider);
};

/** ゲームシーンの状態供給元を登録し，登録解除関数を返す */
export const registerDebugGameSource = (
  provider: DebugStateProvider<DebugGameState>,
): (() => void) => {
  return ensureRegistry().setGameSource(provider);
};
