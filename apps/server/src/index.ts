import { WebSocketServer } from "ws";

// サーバーをポート3000で起動（これで常駐モードになります）
const wss = new WebSocketServer({ port: 3000 });

console.log("Pixel Paint War Server started on port 3000");

// クライアントからの接続を待ち受けるイベント
wss.on("connection", (ws) => {
  console.log("New client connected!");

  ws.on("message", (message) => {
    console.log("Received:", message);
    ws.send(`Server received: ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.send("Welcome to Pixel Paint War Server!");
});
