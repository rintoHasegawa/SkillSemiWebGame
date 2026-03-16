/**
 * worldViewport
 * ワールド座標系の可視領域計算と包含判定を提供する
 */

/** ワールド座標系の可視矩形を表す型 */
export type WorldViewport = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** 画面中心座標とスクリーンサイズから可視矩形を解決する */
export const resolveWorldViewport = (
  centerX: number,
  centerY: number,
  screenWidth: number,
  screenHeight: number,
): WorldViewport => {
  const halfWidth = screenWidth / 2;
  const halfHeight = screenHeight / 2;

  return {
    left: centerX - halfWidth,
    top: centerY - halfHeight,
    right: centerX + halfWidth,
    bottom: centerY + halfHeight,
  };
};

/** 矩形を指定マージンで外側に拡張する */
export const expandWorldViewport = (
  viewport: WorldViewport,
  marginPx: number,
): WorldViewport => {
  return {
    left: viewport.left - marginPx,
    top: viewport.top - marginPx,
    right: viewport.right + marginPx,
    bottom: viewport.bottom + marginPx,
  };
};

/** 点座標が可視矩形内に含まれるか判定する */
export const isPointInViewport = (
  x: number,
  y: number,
  viewport: WorldViewport,
): boolean => {
  return x >= viewport.left
    && x <= viewport.right
    && y >= viewport.top
    && y <= viewport.bottom;
};

/** 円が可視矩形と交差するか判定する */
export const isCircleIntersectingViewport = (
  x: number,
  y: number,
  radiusPx: number,
  viewport: WorldViewport,
): boolean => {
  return x + radiusPx >= viewport.left
    && x - radiusPx <= viewport.right
    && y + radiusPx >= viewport.top
    && y - radiusPx <= viewport.bottom;
};
