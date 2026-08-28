function setEntry(view, offset, tag, type, count, value, shortValue = false) {
  view.setUint16(offset, tag, true);
  view.setUint16(offset + 2, type, true);
  view.setUint32(offset + 4, count, true);
  if (shortValue) {
    view.setUint16(offset + 8, value, true);
    view.setUint16(offset + 10, 0, true);
  } else {
    view.setUint32(offset + 8, value, true);
  }
}

export function encodeRgbTiff({ width, height, rgba, dpi = 300 }) {
  const pixelCount = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Invalid TIFF dimensions');
  }
  if (!rgba || rgba.length < pixelCount * 4) throw new Error('Invalid TIFF pixels');

  const entryCount = 12;
  const ifdOffset = 8;
  const ifdSize = 2 + entryCount * 12 + 4;
  const bitsOffset = ifdOffset + ifdSize;
  const xResolutionOffset = bitsOffset + 6;
  const yResolutionOffset = xResolutionOffset + 8;
  const stripOffset = yResolutionOffset + 8;
  const stripByteCount = pixelCount * 3;
  const bytes = new Uint8Array(stripOffset + stripByteCount);
  const view = new DataView(bytes.buffer);

  bytes[0] = 0x49;
  bytes[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, entryCount, true);

  let entryOffset = ifdOffset + 2;
  const entry = (tag, type, count, value, shortValue = false) => {
    setEntry(view, entryOffset, tag, type, count, value, shortValue);
    entryOffset += 12;
  };
  entry(256, 4, 1, width);
  entry(257, 4, 1, height);
  entry(258, 3, 3, bitsOffset);
  entry(259, 3, 1, 1, true);
  entry(262, 3, 1, 2, true);
  entry(273, 4, 1, stripOffset);
  entry(277, 3, 1, 3, true);
  entry(278, 4, 1, height);
  entry(279, 4, 1, stripByteCount);
  entry(282, 5, 1, xResolutionOffset);
  entry(283, 5, 1, yResolutionOffset);
  entry(296, 3, 1, 2, true);
  view.setUint32(entryOffset, 0, true);

  view.setUint16(bitsOffset, 8, true);
  view.setUint16(bitsOffset + 2, 8, true);
  view.setUint16(bitsOffset + 4, 8, true);
  const normalizedDpi = Math.max(1, Math.round(Number(dpi) || 300));
  view.setUint32(xResolutionOffset, normalizedDpi, true);
  view.setUint32(xResolutionOffset + 4, 1, true);
  view.setUint32(yResolutionOffset, normalizedDpi, true);
  view.setUint32(yResolutionOffset + 4, 1, true);

  let target = stripOffset;
  for (let source = 0; source < pixelCount * 4; source += 4) {
    bytes[target] = rgba[source];
    bytes[target + 1] = rgba[source + 1];
    bytes[target + 2] = rgba[source + 2];
    target += 3;
  }
  return bytes;
}
