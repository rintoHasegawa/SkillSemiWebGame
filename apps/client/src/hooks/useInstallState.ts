/**
 * useInstallState
 * インストールゲートの表示要否と，Android のインストールプロンプト操作を提供するフック
 * 表示モードの変化とインストール完了を監視して判定結果を更新する
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectInstallState,
  STANDALONE_DISPLAY_MODE_QUERIES,
  type InstallEnvironment,
  type InstallState,
} from "./application/installState";

/** beforeinstallprompt イベント（標準の型定義が無いため独自に定義する） */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<unknown>;
};

/** インストール状態フックの公開状態と操作を表す型 */
export type UseInstallStateReturn = {
  installState: InstallState;
  /** ブラウザのインストールプロンプトを表示できるか（Android Chrome 等） */
  canPromptInstall: boolean;
  promptInstall: () => void;
};

const canUseMatchMedia = (): boolean => {
  return typeof window.matchMedia === "function";
};

const isBeforeInstallPromptEvent = (
  event: Event,
): event is BeforeInstallPromptEvent => {
  return (
    "prompt" in event &&
    typeof (event as { prompt?: unknown }).prompt === "function"
  );
};

// window / navigator から判定用の環境情報を読み出す
const readInstallEnvironment = (): InstallEnvironment => {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };

  return {
    matchMedia: canUseMatchMedia()
      ? (query: string) => window.matchMedia(query).matches
      : null,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    isNavigatorStandalone: iosNavigator.standalone === true,
    search: window.location.search,
  };
};

/** インストールゲートの判定結果とインストールプロンプト操作を提供するフック */
export const useInstallState = (): UseInstallStateReturn => {
  const [installState, setInstallState] = useState<InstallState>(() =>
    detectInstallState(readInstallEnvironment()),
  );
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  // 表示モードの変化とインストール完了で判定結果を再評価する
  useEffect(() => {
    const refreshInstallState = () => {
      setInstallState(detectInstallState(readInstallEnvironment()));
    };

    // 表示モードの変化はホーム画面起動判定と同じメディアクエリで監視する
    const mediaQueryLists = canUseMatchMedia()
      ? STANDALONE_DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query))
      : [];

    mediaQueryLists.forEach((mediaQueryList) => {
      mediaQueryList.addEventListener("change", refreshInstallState);
    });
    window.addEventListener("appinstalled", refreshInstallState);

    return () => {
      mediaQueryLists.forEach((mediaQueryList) => {
        mediaQueryList.removeEventListener("change", refreshInstallState);
      });
      window.removeEventListener("appinstalled", refreshInstallState);
    };
  }, []);

  // Android のインストールプロンプトを捕捉し，ゲート内のボタンから呼べるよう保持する
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) {
        return;
      }

      // ブラウザ既定のミニ情報バーを抑止し，ゲートのボタン操作で表示する
      event.preventDefault();
      promptEventRef.current = event;
      setCanPromptInstall(true);
    };

    const handleAppInstalled = () => {
      promptEventRef.current = null;
      setCanPromptInstall(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    const promptEvent = promptEventRef.current;
    if (promptEvent === null) {
      return;
    }

    // 捕捉したイベントは一度しか使えないため，呼び出し時点で破棄する
    promptEventRef.current = null;
    setCanPromptInstall(false);

    void promptEvent.prompt().catch((error: unknown) => {
      console.error(
        "[useInstallState] インストールプロンプトの表示に失敗しました",
        error,
      );
    });
  }, []);

  return { installState, canPromptInstall, promptInstall };
};
