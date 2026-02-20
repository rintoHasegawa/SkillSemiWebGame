import { useEffect, useState, useRef } from "react";
import { Stage, Container } from "@pixi/react";

// 👇 インポートパスを src ディレクトリ基準（./）に修正
import { socketClient } from "./network/SocketClient";
import { GameMap, MAP_SIZE } from "./entities/GameMap";
import { PlayerSprite } from "./entities/PlayerSprite";
import { VirtualJoystick, MAX_DIST } from "./input/VirtualJoystick";

import { TitleScene } from "./scenes/TitleScene";
import { LobbyScene } from "./scenes/LobbyScene";

// 👇 共有パッケージへのパスを src/app.tsx からの相対パスに修正
import type { Room } from "../../../packages/shared/src/types/room"; 

type Player = { id: string; x: number; y: number; color: string; };

// 👇 変更: export default function App() に戻しました
export default function App() {
  const [gameState, setGameState] = useState<"title" | "lobby" | "playing">("title");
  const [room, setRoom] = useState<Room | null>(null);

  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  const myPosRef = useRef({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
  const joystickInputRef = useRef({ x: 0, y: 0 });

  const handleJoystickMove = (moveX: number, moveY: number) => {
    joystickInputRef.current = { x: moveX, y: moveY };
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animationFrameId: number;
    const tick = () => {
      const { x: dx, y: dy } = joystickInputRef.current;
      if (myId && (dx !== 0 || dy !== 0)) {
        const speed = 5.0;
        let nextX = myPosRef.current.x + (dx / MAX_DIST) * speed;
        let nextY = myPosRef.current.y + (dy / MAX_DIST) * speed;
        nextX = Math.max(20, Math.min(MAP_SIZE - 20, nextX));
        nextY = Math.max(20, Math.min(MAP_SIZE - 20, nextY));

        myPosRef.current = { x: nextX, y: nextY };
        socketClient.sendMove(nextX, nextY);

        setPlayers((prev) => {
          if (!prev[myId]) return prev;
          return { ...prev, [myId]: { ...prev[myId], x: nextX, y: nextY } };
        });
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [myId, gameState]);

  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));

    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setGameState("lobby");
    });

    socketClient.onGameStart(() => {
      setGameState("playing");
    });

    socketClient.onCurrentPlayers((serverPlayers: any) => {
      const pMap: Record<string, Player> = {};
      if (Array.isArray(serverPlayers)) serverPlayers.forEach((p) => (pMap[p.id] = p));
      else Object.assign(pMap, serverPlayers);
      setPlayers(pMap);
    });
    socketClient.onNewPlayer((p: Player) => setPlayers((prev) => ({ ...prev, [p.id]: p })));
    socketClient.onUpdatePlayer((data: any) => {
      if (data.id === socketClient.socket.id) return;
      setPlayers((prev) => {
        if (!prev[data.id]) return prev;
        return { ...prev, [data.id]: { ...prev[data.id], ...data } };
      });
    });
    socketClient.onRemovePlayer((id: string) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (gameState === "title") {
    return <TitleScene onJoin={(roomId, playerName) => socketClient.joinRoom(roomId, playerName)} />;
  }

  if (gameState === "lobby") {
    return <LobbyScene room={room} myId={myId} onStart={() => socketClient.startGame()} />;
  }

  const me = myId ? players[myId] : null;
  const camX = (me?.x || MAP_SIZE / 2) - viewport.w / 2;
  const camY = (me?.y || MAP_SIZE / 2) - viewport.h / 2;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#000", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}>
        <Stage width={viewport.w} height={viewport.h} options={{ backgroundColor: 0x000000, antialias: true }}>
          <Container position={[-camX, -camY]}>
            <GameMap />
            {Object.values(players).map((p) => (
              <PlayerSprite key={p.id} x={p.x} y={p.y} color={p.color} isMe={p.id === myId} />
            ))}
          </Container>
        </Stage>
      </div>
      <VirtualJoystick onMove={handleJoystickMove} />
    </div>
  );
}