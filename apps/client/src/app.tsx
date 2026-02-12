import { useEffect, useState, useRef } from "react";
import { Joystick } from "react-joystick-component";
import { io, Socket } from "socket.io-client";

// 設定：マップの広さ（全員共通）
const MAP_SIZE = 2000;

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
  
  // 自分の位置（計算用）
  const myPosRef = useRef({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
  
  const socketRef = useRef<Socket | null>(null);

  // ★ 追加：初期化フラグ
  const initializedRef = useRef(false);

  // ★ 追加：サーバー上の位置と、手元の計算用位置を同期させる魔法
  useEffect(() => {
    // まだIDがない、または既に同期済みなら何もしない
    if (!myId || initializedRef.current) return;

    const me = players[myId];
    if (me) {
      // サーバーの座標を、自分の計算基準(ref)にコピー！
      myPosRef.current = { x: me.x, y: me.y };
      initializedRef.current = true;
      console.log("📍 初期位置を同期しました:", me.x, me.y);
    }
  }, [players, myId]);

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);

    socketRef.current = io();
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      setMyId(socket.id || null);
      // 初期位置ランダム
      /*
      myPosRef.current = { 
        x: Math.random() * (MAP_SIZE - 200) + 100, 
        y: Math.random() * (MAP_SIZE - 200) + 100 
      };
      */
    });

    // 1. 今いるプレイヤー情報
    socket.on("current_players", (serverPlayers: Player[]) => {
      const pMap: Record<string, Player> = {};
      serverPlayers.forEach(p => pMap[p.id] = p);
      setPlayers(pMap);
    });

    // 2. 新しい人が来た
    socket.on("new_player", (p: Player) => {
      setPlayers(prev => ({ ...prev, [p.id]: p }));
    });

    // 3. 誰かが動いた
    socket.on("update_player", (d: { id: string; x: number; y: number }) => {
      // ログを残して、通信が届いているか確認できるようにします
      console.log("Receive:", d);

      // 自分自身のデータであれば、ログだけ出してここで終了（早期リターン）
      // これにより、手元のスムーズな動きがサーバーの古いデータで上書きされなくなります
      if (d.id === socket.id) return; 

      setPlayers(prev => {
        const target = prev[d.id];
        // プレイヤーが存在しない場合は何もしない
        if (!target) return prev; 
        
        return { 
          ...prev, 
          [d.id]: { ...target, x: d.x, y: d.y } 
        };
      });
    });

    // 4. 誰かがいなくなった
    socket.on("player_disconnected", (id: string) => { // ※ここもServer実装によっては要確認
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

  const handleMove = (event: any) => {
    if (!socketRef.current || !myId) return;

    const speed = 4.0;
    let nextX = myPosRef.current.x + (event.x * speed);
    let nextY = myPosRef.current.y - (event.y * speed);

    if (nextX < 20) nextX = 20;
    if (nextX > MAP_SIZE - 20) nextX = MAP_SIZE - 20;
    if (nextY < 20) nextY = 20;
    if (nextY > MAP_SIZE - 20) nextY = MAP_SIZE - 20;

    myPosRef.current = { x: nextX, y: nextY };

    // 自分の画面更新
    setPlayers(prev => {
      if (!prev[myId]) return prev;
      return { ...prev, [myId]: { ...prev[myId], x: nextX, y: nextY } };
    });

    // サーバーへ送信（ここは 'move' で合っています）
    socketRef.current.emit("move", { x: nextX, y: nextY });
  };

  // カメラ計算
  let cameraX = 0;
  let cameraY = 0;

  if (myId && players[myId]) {
    const me = players[myId];
    cameraX = me.x - viewport.w / 2;
    cameraY = me.y - viewport.h / 2;
/*
    if (cameraX < 0) cameraX = 0;
    if (cameraY < 0) cameraY = 0;
    if (cameraX > MAP_SIZE - viewport.w) cameraX = MAP_SIZE - viewport.w;
    if (cameraY > MAP_SIZE - viewport.h) cameraY = MAP_SIZE - viewport.h;
*/
  }

  return (
    <div style={{ 
      width: "100vw", height: "100vh", overflow: "hidden", 
      background: "#111", position: "relative", touchAction: "none"
    }}>
      
      {/* UIレイヤー */}
      <div style={{ 
        position: "fixed", top: 10, left: 10, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", padding: "10px", borderRadius: "8px",
        color: "white", pointerEvents: "none"
      }}>
        <div style={{ color: "#4ade80", fontWeight: "bold" }}>
          ● Online: {Object.keys(players).length}
        </div>
        <div style={{ fontSize: "12px", color: "#ccc" }}>
           ID: {myId?.slice(0, 4)}
        </div>
      </div>

      {/* ゲームワールド */}
      <div style={{
        position: "absolute",
        width: `${MAP_SIZE}px`,
        height: `${MAP_SIZE}px`,
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
              transition: p.id === myId ? "none" : "transform 0.1s linear",
            }}
          >
             <div style={{ 
              position: "absolute", top: -25, left: "50%", transform: "translateX(-50%)", 
              color: "white", fontSize: "10px", whiteSpace: "nowrap", pointerEvents: "none"
            }}>
              {p.id.slice(0,4)}
            </div>
          </div>
        ))}
      </div>

      {/* ジョイスティック */}
      <div style={{ position: "fixed", bottom: 50, left: 30, zIndex: 2000 }}>
        <Joystick 
          size={100} 
          baseColor="rgba(255, 255, 255, 0.2)" 
          stickColor="rgba(255, 255, 255, 0.9)" 
          move={handleMove} 
        />
      </div>
    </div>
  );
}

export default App;