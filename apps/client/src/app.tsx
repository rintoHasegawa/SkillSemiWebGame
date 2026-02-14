import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
// ✅ v7 (安定版) の正しいインポート
import { Stage, Container, Graphics } from "@pixi/react";

const MAP_SIZE = 2000;
const MAX_DIST = 60; // ジョイスティックの可動範囲

type Player = {
  id: string;
  x: number;
  y: number;
  color: string;
};

// 🎨 プレイヤー描画（v7対応）
const PlayerCharacter = ({
  x,
  y,
  color,
  isMe,
}: {
  x: number;
  y: number;
  color: string;
  isMe: boolean;
}) => {
  const draw = useCallback(
    (g: any) => {
      g.clear();
      const hexColor = parseInt(color.replace("#", "0x"), 16) || 0xff0000;

      // v7の書き方: beginFill を使う
      g.beginFill(hexColor);
      g.drawCircle(0, 0, 10);
      g.endFill();

      if (isMe) {
        g.lineStyle(3, 0xffff00);
        g.drawCircle(0, 0, 10);
      }
    },
    [color, isMe],
  );

  return <Graphics draw={draw} x={x} y={y} />;
};

// 🗺️ 背景マップ描画（v7対応）
const GameMap = () => {
  const draw = useCallback((g: any) => {
    g.clear();
    g.beginFill(0x111111);
    g.drawRect(0, 0, MAP_SIZE, MAP_SIZE);
    g.endFill();

    // グリッド線
    g.lineStyle(1, 0x333333);
    for (let i = 0; i <= MAP_SIZE; i += 100) {
      g.moveTo(i, 0).lineTo(i, MAP_SIZE);
      g.moveTo(0, i).lineTo(MAP_SIZE, i);
    }

    // 外枠
    g.lineStyle(5, 0xff4444);
    g.drawRect(0, 0, MAP_SIZE, MAP_SIZE);
  }, []);

  return <Graphics draw={draw} />;
};

export default function App() {
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [viewport, setViewport] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });

  // 自作ジョイスティックの状態
  const [isMoving, setIsMoving] = useState(false);
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });

  const myPosRef = useRef({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
  const socketRef = useRef<Socket | null>(null);

  // 🕹️ 操作開始
  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setBasePos({ x: clientX, y: clientY });
    setStickPos({ x: 0, y: 0 });
    setIsMoving(true);
  };

  // 🕹️ 操作中
  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isMoving) return;
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - basePos.x;
    const dy = clientY - basePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const limitedDist = Math.min(dist, MAX_DIST);
    const moveX = Math.cos(angle) * limitedDist;
    const moveY = Math.sin(angle) * limitedDist;

    setStickPos({ x: moveX, y: moveY });

    if (socketRef.current && myId) {
      const speed = 5.0;
      let nextX = myPosRef.current.x + (moveX / MAX_DIST) * speed;
      let nextY = myPosRef.current.y + (moveY / MAX_DIST) * speed;

      nextX = Math.max(20, Math.min(MAP_SIZE - 20, nextX));
      nextY = Math.max(20, Math.min(MAP_SIZE - 20, nextY));

      myPosRef.current = { x: nextX, y: nextY };

      socketRef.current.emit("move", { x: nextX, y: nextY });
      setPlayers((prev) => {
        if (!prev[myId]) return prev;
        return { ...prev, [myId]: { ...prev[myId], x: nextX, y: nextY } };
      });
    }
  };

  const handleEnd = () => {
    setIsMoving(false);
    setStickPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => setMyId(socket.id || null));
    socket.on("current_players", (serverPlayers: any) => {
      const pMap: Record<string, Player> = {};
      if (Array.isArray(serverPlayers))
        serverPlayers.forEach((p) => (pMap[p.id] = p));
      else Object.assign(pMap, serverPlayers);
      setPlayers(pMap);
    });
    socket.on("new_player", (p: Player) =>
      setPlayers((prev) => ({ ...prev, [p.id]: p })),
    );
    socket.on("update_player", (data: any) => {
      if (data.id === socket.id) return;
      setPlayers((prev) => {
        if (!prev[data.id]) return prev;
        return { ...prev, [data.id]: { ...prev[data.id], ...data } };
      });
    });
    socket.on("remove_player", (id: string) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    const handleResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => {
      socket.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const me = myId ? players[myId] : null;
  const camX = (me?.x || MAP_SIZE / 2) - viewport.w / 2;
  const camY = (me?.y || MAP_SIZE / 2) - viewport.h / 2;

  return (
    <div
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000",
        position: "relative",
        touchAction: "none",
      }}
    >
      {/* 🚀 Layer 1: PixiJS描画 (v7) */}
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}>
        <Stage
          width={viewport.w}
          height={viewport.h}
          options={{ backgroundColor: 0x000000, antialias: true }}
        >
          <Container position={[-camX, -camY]}>
            <GameMap />
            {Object.values(players).map((p) => (
              <PlayerCharacter
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

      {/* 🕹️ Layer 2: ジョイスティックUI */}
      {isMoving && (
        <div
          style={{
            position: "fixed",
            left: basePos.x - MAX_DIST,
            top: basePos.y - MAX_DIST,
            width: MAX_DIST * 2,
            height: MAX_DIST * 2,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 40,
              height: 40,
              background: "rgba(255, 255, 255, 0.8)",
              borderRadius: "50%",
              transform: `translate(calc(-50% + ${stickPos.x}px), calc(-50% + ${stickPos.y}px))`,
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
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
