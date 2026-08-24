/**
 * socketEmitters
 * Socket.IOの送信処理を用途別に生成するアダプタ
 */
import { Server, Socket } from "socket.io";
import type {
  ServerToClientEventPayloadMap,
  ServerToClientPayloadOf,
} from "@repo/shared";

type SocketEventName = keyof ServerToClientEventPayloadMap;

type EmitToRoom = {
  <TEvent extends SocketEventName>(roomId: string, event: TEvent): void;
  <TEvent extends SocketEventName>(roomId: string, event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

type EmitToRoomExceptSocket = {
  <TEvent extends SocketEventName>(roomId: string, excludedSocketId: string, event: TEvent): void;
  <TEvent extends SocketEventName>(roomId: string, excludedSocketId: string, event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

type EmitToSocket = {
  <TEvent extends SocketEventName>(event: TEvent): void;
  <TEvent extends SocketEventName>(event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

type EmitToSocketById = {
  <TEvent extends SocketEventName>(socketId: string, event: TEvent): void;
  <TEvent extends SocketEventName>(socketId: string, event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

type CloseRoomChannel = (roomId: string) => void;

type EmitToAll = {
  <TEvent extends SocketEventName>(event: TEvent): void;
  <TEvent extends SocketEventName>(event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

/**
 * アプリのルームIDを Socket.IO のルーム名へ変換する
 * Socket.IO は各ソケットを自身のソケットIDと同名の個別ルームへ自動参加させるため，
 * クライアント指定の roomId をそのまま使うと他ソケットの個別ルームへ同席できてしまう
 * プレフィックスを付けてソケットID（英数字と _ - のみ）と衝突しない名前空間に分離する
 */
export const toSocketRoomName = (roomId: string): string => {
  return `room:${roomId}`;
};

/** ペイロード有無に応じて emit 呼び出しシグネチャを切り替える共通関数 */
const emitWithOptionalPayload = (
  emit: (event: SocketEventName, payload?: unknown) => void,
  event: SocketEventName,
  payload?: unknown
) => {
  if (payload === undefined) {
    emit(event);
    return;
  }

  emit(event, payload);
};

/** ルーム単位の送信関数を生成する */
export const createEmitToRoom = (io: Server): EmitToRoom => {
  return (roomId: string, event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload(
      (eventName, body) => io.to(toSocketRoomName(roomId)).emit(eventName, body),
      event,
      payload
    );
  };
};

/** ルーム送信時に特定ソケットを除外する送信関数を生成する */
export const createEmitToRoomExceptSocket = (io: Server): EmitToRoomExceptSocket => {
  return (roomId: string, excludedSocketId: string, event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload(
      (eventName, body) =>
        io.to(toSocketRoomName(roomId)).except(excludedSocketId).emit(eventName, body),
      event,
      payload
    );
  };
};

/** 単一ソケット向けの送信関数を生成する */
export const createEmitToSocket = (socket: Socket): EmitToSocket => {
  return (event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload((eventName, body) => socket.emit(eventName, body), event, payload);
  };
};

/** 任意ソケットID向けの送信関数を生成する */
export const createEmitToSocketById = (io: Server): EmitToSocketById => {
  return (socketId: string, event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload((eventName, body) => io.to(socketId).emit(eventName, body), event, payload);
  };
};

/** 全接続向けの送信関数を生成する */
export const createEmitToAll = (io: Server): EmitToAll => {
  return (event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload((eventName, body) => io.emit(eventName, body), event, payload);
  };
};

/**
 * ルームチャンネルの在室ソケットを一括退出させる関数を生成する
 * ルーム削除後もソケットがチャンネルに残ると，同名ルーム再作成時に
 * 無関係な配信を受け取ってしまうため，削除時に必ず閉じる
 */
export const createCloseRoomChannel = (io: Server): CloseRoomChannel => {
  return (roomId: string) => {
    const socketRoomName = toSocketRoomName(roomId);
    io.in(socketRoomName).socketsLeave(socketRoomName);
  };
};
