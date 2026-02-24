import { LocalPlayerController, RemotePlayerController } from "../entities/player/PlayerController";

export type GamePlayerController = LocalPlayerController | RemotePlayerController;
export type GamePlayers = Record<string, GamePlayerController>;
