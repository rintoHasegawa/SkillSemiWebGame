import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

// 設定：マップの広さ（全員共通）
const MAP_SIZE = 2000;
// ジョイスティックの設定（Joystick.ts のロジックを参考）
const MAX_DIST = 60; 

type Player = {
  id: string;
  x: number;
  y: number;
  color: string;
};

function App() {
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  
  // 画面サイズ（カメラ計算用）
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  
  // 自作ジョイスティックの状態管理
  const [isMoving, setIsMoving] = useState(false);
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });   // タッチを開始した中心点
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 }); // スティックの相対移動量
  
  // 自分の位置（計算用）
  const myPosRef = useRef({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
  const socketRef = useRef<Socket | null>(null);
  const initializedRef = useRef(false);

  // 1. タッチ/クリック開始：ジョイスティックの拠点を決める
  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setBasePos({ x: clientX, y: clientY });
    setStickPos({ x: 0, y: 0 });
    setIsMoving(true);
  };

  // 2. 移動中：スティックを動かし、プレイヤーを移動させる
  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isMoving) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // 中心からの距離と角度を計算
    const dx = clientX - basePos.x;
    const dy = clientY - basePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // スティックが外枠からはみ出さないように制限 (Joystick.ts のロジック)
    const limitedDist = Math.min(dist, MAX_DIST);
    const moveX = Math.cos(angle) * limitedDist;
    const moveY = Math.sin(angle) * limitedDist;

    setStickPos({ x: moveX, y: moveY });

    // 入力値の正規化 (-1.0 ～ 1.0)
    const inputX = moveX / MAX_DIST;
    const inputY = moveY / MAX_DIST;

    if (!socketRef.current || !myId) return;

    // 移動の実行
    const speed = 5.0; 
    let nextX = myPosRef.current.x + (inputX * speed);
    let nextY = myPosRef.current.y + (inputY * speed);

    // 壁判定
    if (nextX < 20) nextX = 20;
    if (nextX > MAP_SIZE - 20) nextX = MAP_SIZE - 20;
    if (nextY < 20) nextY = 20;
    if (nextY > MAP_SIZE - 20) nextY = MAP_SIZE - 20;

    myPosRef.current = { x: nextX, y: nextY };

    // 自分の画面を即座に更新
    setPlayers(prev => {
      if (!prev[myId]) return prev;
      return { ...prev, [myId]: { ...prev[myId], x: nextX, y: nextY } };
    });

    // サーバーへ送信
    socketRef.current.emit("move", { x: nextX, y: nextY });
  };

  // 3. 終了：ジョイスティックをリセット
  const handleEnd = () => {
    setIsMoving(false);
    setStickPos({ x: 0, y: 0 });
  };

  // 初期位置同期
  useEffect(() => {
    if (!myId || initializedRef.current) return;
    const me = players[myId];
    if (me) {
      myPosRef.current = { x: me.x, y: me.y };
      initializedRef.current = true;
    }
  }, [players, myId]);

  // Socket通信設定
  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);

    socketRef.current = io();
    const socket = socketRef.current;

    socket.on("connect", () => setMyId(socket.id || null));
    socket.on("current_players", (serverPlayers: Player[]) => {
      const pMap: Record<string, Player> = {};
      serverPlayers.forEach(p => pMap[p.id] = p);
      setPlayers(pMap);
    });
    socket.on("new_player", (p: Player) => setPlayers(prev => ({ ...prev, [p.id]: p })));
    socket.on("update_player", (d: { id: string; x: number; y: number }) => {
      if (d.id === socket.id) return; 
      setPlayers(prev => {
        const target = prev[d.id];
        if (!target) return prev; 
        return { ...prev, [d.id]: { ...target, x: d.x, y: d.y } };
      });
    });
    socket.on("remove_player", (id: string) => {
      setPlayers(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      socket.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // カメラ計算
  let cameraX = 0;
  let cameraY = 0;
  if (myId && players[myId]) {
    const me = players[myId];
    cameraX = me.x - viewport.w / 2;
    cameraY = me.y - viewport.h / 2;
  }

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
        width: "100vw", height: "100vh", overflow: "hidden", 
        background: "#111", position: "relative", touchAction: "none"
      }}
    >
      
      {/* UIレイヤー */}
      <div style={{ position: "fixed", top: 10, left: 10, zIndex: 1000, background: "rgba(0,0,0,0.6)", padding: "10px", borderRadius: "8px", color: "white", pointerEvents: "none" }}>
        <div style={{ color: "#4ade80", fontWeight: "bold" }}>● Online: {Object.keys(players).length}</div>
        <div style={{ fontSize: "12px", color: "#ccc" }}>ID: {myId?.slice(0, 4)}</div>
      </div>

      {/* ゲームワールド */}
      <div style={{
        position: "absolute",
        width: `${MAP_SIZE}px`, height: `${MAP_SIZE}px`,
        transform: `translate(${-cameraX}px, ${-cameraY}px)`,
        backgroundImage: "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
        backgroundSize: "100px 100px",
        backgroundColor: "#222",
        border: "5px solid #ff4444"
      }}>
        {Object.values(players).map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: 0, top: 0,
              transform: `translate(${p.x}px, ${p.y}px)`, 
              width: "20px", height: "20px",
              background: p.color || "red",
              borderRadius: "50%",
              border: p.id === myId ? "2px solid yellow" : "none",
              boxShadow: p.id === myId ? "0 0 15px rgba(255,255,0,0.5)" : "none",
              zIndex: p.id === myId ? 100 : 1,
              marginTop: "-10px", marginLeft: "-10px",
              // 自分は即時反映、他人は滑らかに
              transition: p.id === myId ? "none" : "transform 0.1s linear",
            }}
          >
             <div style={{ position: "absolute", top: -25, left: "50%", transform: "translateX(-50%)", color: "white", fontSize: "10px", whiteSpace: "nowrap", pointerEvents: "none" }}>
              {p.id.slice(0,4)}
            </div>
          </div>
        ))}
      </div>

      {/* 自作ジョイスティックのUI */}
      {isMoving && (
        <div style={{
          position: "fixed",
          left: basePos.x - MAX_DIST,
          top: basePos.y - MAX_DIST,
          width: MAX_DIST * 2,
          height: MAX_DIST * 2,
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          pointerEvents: "none",
          zIndex: 2000
        }}>
          {/* 内側の動くスティック部分 */}
          <div style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: 40, height: 40,
            background: "rgba(255, 255, 255, 0.8)",
            borderRadius: "50%",
            // 相対的な移動量を適用
            transform: `translate(calc(-50% + ${stickPos.x}px), calc(-50% + ${stickPos.y}px))`,
            boxShadow: "0 0 10px rgba(0,0,0,0.5)"
          }} />
        </div>
      )}
    </div>
  );
}

export default App;