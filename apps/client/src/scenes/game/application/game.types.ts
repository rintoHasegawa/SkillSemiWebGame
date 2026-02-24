/**
 * game.types
 * ゲームアプリケーション層で共有する型定義をまとめる
 * プレイヤーコントローラーの集合表現を提供する
 */
import { LocalPlayerController, RemotePlayerController } from "@client/scenes/game/entities/player/PlayerController";

/** ゲームで扱うプレイヤーコントローラーのユニオン型 */
export type GamePlayerController = LocalPlayerController | RemotePlayerController;
/** プレイヤーIDをキーにしたコントローラー管理マップ型 */
export type GamePlayers = Record<string, GamePlayerController>;
