import { useEffect, useState, useRef } from "react";
import { Stage, Container } from "@pixi/react";

import { socketClient } from "./network/SocketClient";
import { GameMap, MAP_SIZE } from "./entities/GameMap";
import { PlayerSprite } from "./entities/PlayerSprite";
// ✅ 追加: 切り出したジョイスティックを読み込む
import { VirtualJoystick, MAX_DIST } from "./input/VirtualJoystick";

type Player = {
  id: string;
  x: number;
  y: number;
  color: string;
};

export default function App() {
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [viewport, setViewport] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });

  const myPosRef = useRef({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });

  // 🕹️ ジョイスティックから受け取った移動量で計算するだけ
  const handleJoystickMove = (moveX: number, moveY: number) => {
    if (!myId) return;
    const speed = 5.0;
    let nextX = myPosRef.current.x + (moveX / MAX_DIST) * speed;
    let nextY = myPosRef.current.y + (moveY / MAX_DIST) * speed;

    nextX = Math.max(20, Math.min(MAP_SIZE - 20, nextX));
    nextY = Math.max(20, Math.min(MAP_SIZE - 20, nextY));

    myPosRef.current = { x: nextX, y: nextY };
    
    // サーバーへ送信
    socketClient.sendMove(nextX, nextY);

    setPlayers((prev) => {
      if (!prev[myId]) return prev;
      return { ...prev, [myId]: { ...prev[myId], x: nextX, y: nextY } };
    });
  };

  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));

    socketClient.onCurrentPlayers((serverPlayers: any) => {
      const pMap: Record<string, Player> = {};
      if (Array.isArray(serverPlayers))
        serverPlayers.forEach((p) => (pMap[p.id] = p));
      else Object.assign(pMap, serverPlayers);
      setPlayers(pMap);
    });

    socketClient.onNewPlayer((p: Player) => {
      setPlayers((prev) => ({ ...prev, [p.id]: p }));
    });

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

  const me = myId ? players[myId] : null;
  const camX = (me?.x || MAP_SIZE / 2) - viewport.w / 2;
  const camY = (me?.y || MAP_SIZE / 2) - viewport.h / 2;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}>
        <Stage
          width={viewport.w}
          height={viewport.h}
          options={{ backgroundColor: 0x000000, antialias: true }}
        >
          <Container position={[-camX, -camY]}>
            <GameMap />
            {Object.values(players).map((p) => (
              <PlayerSprite
                key={p.id}
                x={p.x}
                y={p.y}
                color={p.color}
                isMe={p.id === myId}
              />
            ))}
          </Container>
        </Stage>
      </div>

      {/* ✅ 複雑だった div タグの塊がたったの1行に！ */}
      <VirtualJoystick onMove={handleJoystickMove} />

      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          color: "#4ade80",
          zIndex: 100,
          pointerEvents: "none",
          fontWeight: "bold",
        }}
      >
        ● Online: {Object.keys(players).length}
      </div>
    </div>
  );
}