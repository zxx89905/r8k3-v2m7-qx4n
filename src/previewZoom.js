export const PREVIEW_ZOOM_MIN = 50;
export const PREVIEW_ZOOM_MAX = 200;
export const PREVIEW_ZOOM_STEP = 25;

export function clampPreviewZoom(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 100;
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, numericValue));
}

export function stepPreviewZoom(value, direction) {
  return clampPreviewZoom(Number(value) + Math.sign(direction) * PREVIEW_ZOOM_STEP);
}

export function scalePreviewSize(size, zoom) {
  const scale = clampPreviewZoom(zoom) / 100;
  return {
    width: Number(size?.width || 0) * scale,
    height: Number(size?.height || 0) * scale,
  };
}
