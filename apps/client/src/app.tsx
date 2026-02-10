import { useEffect, useState, useRef } from "react";
import { Joystick } from "react-joystick-component";
import { io, Socket } from "socket.io-client";

// プレイヤーの型定義（サーバーと同じ形にする）
type Player = {
  id: string;
  x: number;
  y: number;
  color: string;
};

function App() {
  // 自分のIDを保存する場所
  const [myId, setMyId] = useState<string | null>(null);
  // 全員のプレイヤー情報を保存する場所 { "ID": {プレイヤー情報}, ... }
  const [players, setPlayers] = useState<Record<string, Player>>({});
  
  // 通信の接続（二重接続防止のため useRef を使う）
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. サーバーに接続
    // Viteのプロキシ設定があるので、パスは自動で解決されます
    socketRef.current = io();
    const socket = socketRef.current;

    // 接続成功したとき
    socket.on("connect", () => {
      console.log("✅ Connected with ID:", socket.id);
      setMyId(socket.id || null);
    });

    // --- サーバーからの命令を受け取る ---

    // 1. 今いる全員のリストを受け取る
    socket.on("current_players", (serverPlayers: Player[]) => {
      const playersMap: Record<string, Player> = {};
      serverPlayers.forEach((p) => {
        playersMap[p.id] = p;
      });
      setPlayers(playersMap);
    });

    // 2. 新しい人が来た
    socket.on("new_player", (player: Player) => {
      setPlayers((prev) => ({ ...prev, [player.id]: player }));
    });

    // 3. 誰かが動いた
    socket.on("update_player", (data: { id: string; x: number; y: number }) => {
      setPlayers((prev) => {
        const target = prev[data.id];
        if (!target) return prev; // 知らない人なら何もしない
        // その人の位置だけ更新して新しいリストを作る
        return {
          ...prev,
          [data.id]: { ...target, x: data.x, y: data.y },
        };
      });
    });

    // 4. 誰かがいなくなった
    socket.on("remove_player", (id: string) => {
      setPlayers((prev) => {
        const newPlayers = { ...prev };
        delete newPlayers[id];
        return newPlayers;
      });
    });

    // 片付け（画面を閉じたときに通信を切る）
    return () => {
      socket.disconnect();
    };
  }, []);

  // ジョイスティックを動かしたとき
  const handleMove = (event: any) => {
    if (socketRef.current) {
      socketRef.current.emit("move", { x: event.x, y: event.y });
    }
  };

  const handleStop = () => {
    if (socketRef.current) {
      socketRef.current.emit("move", { x: 0, y: 0 });
    }
  };

  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex",
      flexDirection: "column", justifyContent: "center", alignItems: "center",
      background: "#222", color: "white", overflow: "hidden", userSelect: "none"
    }}>
      <h1>Multiplayer: {Object.keys(players).length} Online</h1>

      {/* ゲーム画面エリア */}
      <div style={{
        position: "relative", width: "300px", height: "300px",
        border: "2px solid #555", borderRadius: "10px", marginBottom: "20px",
        background: "#333", overflow: "hidden"
      }}>
        {/* 全員分のボールを描画するループ処理 */}
        {Object.values(players).map((player) => (
          <div
            key={player.id}
            style={{
              position: "absolute",
              left: `${player.x}px`,
              top: `${player.y}px`,
              width: "20px",
              height: "20px",
              background: player.color || "red", // サーバーが決めた色
              borderRadius: "50%",
              // 自分だけ枠線を黄色にする
              border: player.id === myId ? "2px solid yellow" : "none",
              zIndex: player.id === myId ? 10 : 1, // 自分を一番手前に
              marginLeft: "-25px", // 中心に配置
              marginTop: "-25px",
              
              transition: "transform 0.05s linear" // 動きを滑らかにする
            }}
          />
        ))}
      </div>

      <Joystick
        size={100} baseColor="#444" stickColor="#888"
        move={handleMove} stop={handleStop}
      />
    </div>
  );
}

export default App;