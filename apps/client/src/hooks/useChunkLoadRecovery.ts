/**
 * useChunkLoadRecovery
 * 遅延チャンクの取得失敗を捕捉するハンドラをアプリ起動時に登録するフック
 * チャンク欠落はゲーム開始以外の遅延ロードでも起こりうるため，
 * シーン単位ではなくルートで購読する
 */
import { useEffect } from "react";
import { registerChunkPreloadErrorHandler } from "@client/pwa/chunkLoadRecovery";

/** チャンク取得失敗からの自動復旧を有効にするフック */
export const useChunkLoadRecovery = (): void => {
  useEffect(() => {
    return registerChunkPreloadErrorHandler();
  }, []);
};
