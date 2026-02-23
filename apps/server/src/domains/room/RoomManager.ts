import { roomConsts, config } from "@repo/shared";
import type { roomTypes } from "@repo/shared";

export class RoomManager {
  private rooms: Map<string, roomTypes.Room> = new Map();

  // ルームにプレイヤーを追加（なければ作成）
  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): roomTypes.Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId: roomId,
        ownerId: socketId,
        players: [],
        status: roomConsts.RoomPhase.WAITING,
        maxPlayers: config.GAME_CONFIG.MAX_PLAYERS_PER_ROOM
      };
      this.rooms.set(roomId, room);
      console.log("[RoomManager] created room", { roomId, ownerId: socketId });
    }

    const newPlayer: roomTypes.RoomMember = {
      id: socketId,
      name: playerName,
      isOwner: room.ownerId === socketId,
      isReady: false
    };
    room.players.push(newPlayer);
    console.log("[RoomManager] player joined", {
      roomId,
      socketId,
      playerName,
      totalPlayers: room.players.length
    });

    return room;
  }

  // プレイヤーをルームから削除し、更新があったルームの配列を返す
  public removePlayer(socketId: string): roomTypes.Room[] {
    const updatedRooms: roomTypes.Room[] = [];
    
    for (const [roomId, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        console.log("[RoomManager] player left", {
          roomId,
          socketId,
          totalPlayers: room.players.length
        });
        
        if (room.players.length === 0) {
          // 空ルーム削除
          this.rooms.delete(roomId);
          console.log("[RoomManager] deleted room", { roomId });
        } else {
          // オーナー切断時所有権移譲処理
          if (room.ownerId === socketId) {
            room.ownerId = room.players[0].id;
            room.players[0].isOwner = true;
            console.log("[RoomManager] transferred ownership", {
              roomId,
              newOwnerId: room.ownerId
            });
          }
          updatedRooms.push(room);
        }
      }
    }
    return updatedRooms;
  }

  // オーナーIDからルームを取得
  public getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.ownerId === ownerId) {
        return room;
      }
    }
    return undefined;
  }
}