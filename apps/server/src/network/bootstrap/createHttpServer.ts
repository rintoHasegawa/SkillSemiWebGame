/**
 * createHttpServer
 * ヘルスチェック用途のHTTPサーバを生成する
 */
import { createServer } from "http";

/** ルートの疎通確認と未定義パス応答を提供するHTTPサーバを生成する */
export const createHttpServer = () => {
  return createServer((req, res) => {
    // ヘルスチェック要求に成功応答を返す
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ok");
      return;
    }

    // 未定義パスには404を返す
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
  });
};
