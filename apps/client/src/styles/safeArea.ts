/**
 * safeArea
 * safe-area-inset を考慮したCSSオフセット値生成ユーティリティ
 */

/** 右端オフセットにsafe-area-inset-rightを加算した値を返す */
export const safeRight = (px: number): string =>
  `max(${px}px, calc(${px}px + env(safe-area-inset-right)))`

/** 左端オフセットにsafe-area-inset-leftを加算した値を返す */
export const safeLeft = (px: number): string =>
  `max(${px}px, calc(${px}px + env(safe-area-inset-left)))`

/** 上端オフセットにsafe-area-inset-topを加算した値を返す */
export const safeTop = (px: number): string =>
  `max(${px}px, calc(${px}px + env(safe-area-inset-top)))`

/** 下端オフセットにsafe-area-inset-bottomを加算した値を返す */
export const safeBottom = (px: number): string =>
  `max(${px}px, calc(${px}px + env(safe-area-inset-bottom)))`
