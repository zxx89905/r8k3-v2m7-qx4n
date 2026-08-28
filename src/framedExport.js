const FRAME_STYLES = {
  black: { frameRatio: 0.035, frame: '#171717' },
  white: { frameRatio: 0.035, frame: '#f7f7f4', inner: '#aeb2ac' },
  oak: { frameRatio: 0.04, frame: '#bf8c57', inner: '#e2b77e' },
  walnut: { frameRatio: 0.04, frame: '#533323', inner: '#8b6043' },
  gold: { frameRatio: 0.035, frame: '#b99a58', inner: '#eed59b' },
  silver: { frameRatio: 0.035, frame: '#b9bec0', inner: '#eef0f0' },
  espresso: { frameRatio: 0.035, frame: '#2b201c', inner: '#685047' },
  acrylic: { frameRatio: 0.035, frame: '#eef2f0', inner: '#ffffff' },
  museum: { frameRatio: 0.02, matRatio: 0.08, frame: '#1a1a19', mat: '#f2f0e9' },
};

export function getFramedExportLayout(frameId, posterWidth, posterHeight) {
  const style = FRAME_STYLES[frameId];
  if (!style) return null;
  const basis = Math.min(posterWidth, posterHeight);
  const frameWidth = Math.round(basis * style.frameRatio);
  const matWidth = Math.round(basis * (style.matRatio || 0));
  const inset = frameWidth + matWidth;
  return {
    width: posterWidth + inset * 2,
    height: posterHeight + inset * 2,
    posterX: inset,
    posterY: inset,
    posterWidth,
    posterHeight,
    frameWidth,
    matWidth,
  };
}

export function createFramedCanvas(sourceCanvas, frameId) {
  const layout = getFramedExportLayout(frameId, sourceCanvas.width, sourceCanvas.height);
  if (!layout) return null;
  const style = FRAME_STYLES[frameId];
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext('2d');
  context.fillStyle = style.frame;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (layout.matWidth) {
    context.fillStyle = style.mat;
    context.fillRect(
      layout.frameWidth,
      layout.frameWidth,
      canvas.width - layout.frameWidth * 2,
      canvas.height - layout.frameWidth * 2,
    );
  } else if (style.inner) {
    context.strokeStyle = style.inner;
    context.lineWidth = Math.max(2, Math.round(layout.frameWidth * 0.08));
    const offset = layout.frameWidth - context.lineWidth / 2;
    context.strokeRect(offset, offset, canvas.width - offset * 2, canvas.height - offset * 2);
  }
  context.drawImage(sourceCanvas, layout.posterX, layout.posterY);
  return canvas;
}
