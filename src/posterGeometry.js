export function getBarcodeGeometry(scale = 1) {
  return {
    width: 284 * scale,
    height: 79 * scale,
    fallbackWidth: 240 * scale,
    fallbackHeight: 59 * scale,
    fallbackOffsetY: 10 * scale,
  };
}
