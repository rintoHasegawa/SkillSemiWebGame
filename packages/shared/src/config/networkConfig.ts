/**
 * networkConfig
 * ネットワーク通信で利用する共有設定値を定義する
 * クライアントとサーバーの接続契約を集約する
 */

/** ソケット通信で利用する共有設定値 */
export const NETWORK_CONFIG = {
  SOCKET_IO_PATH: "/socket.io",
} as const;
