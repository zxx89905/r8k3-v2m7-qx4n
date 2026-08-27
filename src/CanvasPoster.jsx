import { useEffect, useRef } from 'react';

const BASE_WIDTH = 1200;

function hexToRgb(value) {
  const hex = String(value || '').replace('#', '');
  if (hex.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

function mixHex(first, second, amount) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const mix = (key) => Math.round(a[key] + (b[key] - a[key]) * amount).toString(16).padStart(2, '0');
  return '#' + mix('r') + mix('g') + mix('b');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('No image'));
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawFallbackBarcode(ctx, value, x, y, width, height, color) {
  const seed = [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
  const markRadius = Math.min(height * 0.42, 18);
  drawSpotifyMark(ctx, x, y + (height - markRadius * 2) / 2, markRadius, color);
  let cursor = x + markRadius * 2 + 14;
  let index = 0;
  while (cursor < x + width) {
    const bar = 2 + ((seed + index * 17) % 4);
    const gap = 1 + ((seed + index * 7) % 3);
    ctx.fillStyle = color;
    ctx.fillRect(cursor, y, Math.min(bar, x + width - cursor), height);
    cursor += bar + gap;
    index += 1;
  }
}

function drawSpotifyMark(ctx, x, y, radius, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + radius, y + heightForSpotifyMark(radius), radius, 0, Math.PI * 2);
  ctx.fill();
  const rgb = hexToRgb(color);
  const luminance = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
  ctx.strokeStyle = luminance > 150 ? '#111111' : '#ffffff';
  ctx.lineWidth = Math.max(1.5, radius * 0.13);
  ctx.lineCap = 'round';
  for (const offset of [-0.28, 0, 0.28]) {
    ctx.beginPath();
    ctx.arc(x + radius, y + heightForSpotifyMark(radius) + offset * radius, radius * 0.55, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }
  ctx.restore();
}

function heightForSpotifyMark(radius) {
  return radius;
}

async function drawSpotifyCode(ctx, uri, x, y, width, height, paper, ink) {
  if (!uri) return false;
  try {
    const paperRgb = hexToRgb(paper);
    const paperLuminance = paperRgb.r * 0.299 + paperRgb.g * 0.587 + paperRgb.b * 0.114;
    const foreground = paperLuminance < 125 ? 'white' : 'black';
    const endpoint = 'https://scannables.scdn.co/uri/plain/svg/' + paper.replace('#', '') + '/' + foreground + '/640/' + uri;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Spotify code unavailable');
    let svg = await response.text();
    const sourceColors = foreground === 'white'
      ? /fill=["'](?:#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["']/gi
      : /fill=["'](?:#000(?:000)?|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))["']/gi;
    svg = svg.replace(sourceColors, `fill="${ink}"`);
    const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = await loadImage(objectUrl);
    const ratio = image.width / image.height || 3.55;
    const fittedWidth = Math.min(width, height * ratio);
    const fittedHeight = fittedWidth / ratio;
    ctx.drawImage(image, x + (width - fittedWidth) / 2, y + (height - fittedHeight) / 2, fittedWidth, fittedHeight);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    return false;
  }
}

function clipCircle(ctx, cx, cy, radius) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
}

function drawCover(ctx, image, cx, cy, radius, coverEffect) {
  ctx.save();
  clipCircle(ctx, cx, cy, radius);
  ctx.clip();
  ctx.filter = coverEffect || 'none';
  const imageRatio = image.width / image.height;
  let drawWidth = radius * 2;
  let drawHeight = radius * 2;
  if (imageRatio > 1) drawWidth = drawHeight * imageRatio;
  else drawHeight = drawWidth / imageRatio;
  ctx.drawImage(image, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

function drawRecordLabel(ctx, cx, cy, radius, accent, ink, paper) {
  ctx.save();
  ctx.shadowColor = '#0000002b';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Keep the label intentionally quiet: a single color field makes the
  // artwork and lyric rings read clearly at both poster and thumbnail size.
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.arc(cx, cy, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink + '45';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

function fitTextSize(ctx, text, preferredSize, maxWidth, fontFamily, weight = 700, minimum = 22) {
  let size = preferredSize;
  while (size > minimum) {
    ctx.font = weight + ' ' + size + 'px ' + fontFamily;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function drawLyricsBackground(ctx, shape, cx, cy, radius, disc) {
  if (shape === 'none') return;
  ctx.save();
  ctx.shadowColor = '#00000036';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoverShadow(ctx, cx, cy, radius, ink) {
  ctx.save();
  ctx.shadowColor = ink + '45';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 11;
  ctx.fillStyle = '#ffffff01';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTonearm(ctx, style, cx, cy, radius, scale, paper, ink, accent) {
  if (!style || style === 'none') return;
  const pivotX = cx + radius * 0.88;
  const pivotY = cy - radius * 0.88;
  // A real tonearm reaches the outer groove, not the record label in the center.
  const needleX = cx + radius * 0.745;
  const needleY = cy + radius * 0.10;
  const metal = mixHex(paper, ink, 0.58);
  const brightMetal = mixHex(paper, '#ffffff', 0.68);
  const armColor = style === 'retro' ? mixHex(accent, ink, 0.2) : style === 'studio' ? brightMetal : style === 'classic' ? ink : style === 'wire' ? ink : metal;
  const armWidth = style === 'minimal' ? 11 : style === 'retro' ? 16 : style === 'studio' ? 13 : style === 'wire' ? 8 : 15;

  const drawArmPath = (path) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#00000032';
    ctx.lineWidth = armWidth + 8;
    ctx.translate(0, 9);
    ctx.stroke(path);
    ctx.restore();
    ctx.strokeStyle = armColor;
    ctx.lineWidth = armWidth;
    ctx.stroke(path);
    ctx.strokeStyle = style === 'retro' ? mixHex(armColor, paper, 0.34) : style === 'studio' ? '#ffffffaa' : mixHex(armColor, paper, 0.24);
    ctx.lineWidth = Math.max(2, armWidth * 0.2);
    ctx.stroke(path);
  };

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.scale(scale, scale);
  ctx.translate(-pivotX, -pivotY);

  // Keep the pivot outside the lyric field, like the compact record posters that sell well on Etsy.
  if (style === 'retro') {
    ctx.save();
    ctx.shadowColor = '#00000042';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = mixHex(paper, '#7b4c2a', 0.38);
    ctx.beginPath();
    ctx.roundRect(pivotX - 35, pivotY - 24, 70, 48, 12);
    ctx.fill();
    ctx.restore();
  } else if (style !== 'wire') {
    ctx.save();
    ctx.shadowColor = '#00000036';
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle = style === 'studio' ? mixHex(paper, ink, 0.14) : ink;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, style === 'minimal' ? 23 : 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = style === 'retro' ? accent : style === 'studio' ? brightMetal : paper;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, style === 'wire' ? 7 : 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style === 'wire' ? accent : ink;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  const path = new Path2D();
  path.moveTo(pivotX, pivotY);
  if (style === 'minimal') {
    path.lineTo(pivotX - 18, pivotY + 28);
    path.quadraticCurveTo(cx + radius * 0.9, cy - radius * 0.16, needleX + 22, needleY - 10);
    path.lineTo(needleX, needleY);
  } else if (style === 'retro') {
    path.lineTo(pivotX - 34, pivotY + 40);
    path.quadraticCurveTo(cx + radius * 0.98, cy - radius * 0.12, needleX + 34, needleY - 14);
    path.quadraticCurveTo(needleX + 8, needleY - 2, needleX, needleY);
  } else if (style === 'studio') {
    path.bezierCurveTo(pivotX - 5, pivotY + 70, cx + radius * 0.97, cy - radius * 0.32, cx + radius * 0.84, cy - radius * 0.04);
    path.bezierCurveTo(cx + radius * 0.72, cy + radius * 0.16, needleX + 82, needleY - 42, needleX + 30, needleY - 7);
    path.quadraticCurveTo(needleX + 8, needleY - 2, needleX, needleY);
  } else if (style === 'wire') {
    path.quadraticCurveTo(cx + radius * 0.94, cy - radius * 0.12, needleX + 28, needleY - 8);
    path.lineTo(needleX, needleY);
  } else {
    path.lineTo(pivotX - 32, pivotY + 60);
    path.quadraticCurveTo(pivotX - 26, pivotY + 92, cx + radius * 0.88, cy - radius * 0.06);
    path.quadraticCurveTo(cx + radius * 0.78, cy + radius * 0.11, needleX + 34, needleY - 14);
    path.quadraticCurveTo(needleX + 9, needleY - 3, needleX, needleY);
  }
  drawArmPath(path);

  const fixedNeedleX = pivotX + (needleX - pivotX) * scale;
  const fixedNeedleY = pivotY + (needleY - pivotY) * scale;
  ctx.restore();

  // The cartridge stays at a fixed visual size while the arm length can be adjusted.
  const angle = -0.18;
  ctx.save();
  ctx.translate(fixedNeedleX, fixedNeedleY);
  ctx.rotate(angle);
  ctx.fillStyle = ink;
  ctx.shadowColor = '#00000040';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(-11, -14, 43, 28, 7);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(20, -10, 18, 20, 5);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillRect(35, -2, 13, 4);
  ctx.restore();
}

function normalizeLyricText(text) {
  return String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // English punctuation hugs the preceding word; opening punctuation hugs
    // the following word. This prevents visible gaps such as "word ,".
    .replace(/\s+([,.;:!?，。！？、；：])/g, '$1')
    .replace(/([,.;:!?])(?=[A-Za-z])/g, '$1 ')
    .replace(/([([{“‘])\s+/g, '$1')
    .replace(/\s+([)\]}”’])/g, '$1')
    .replace(/([A-Za-z])\s*'\s*([A-Za-z])/g, "$1'$2");
}

function spiralTokenLayout(ctx, token, fontSize, charSpacing, wordSpacing) {
  const isSpace = /^\s+$/.test(token);
  const glyphs = isSpace ? [] : Array.from(token);
  const tracking = Math.max(0.25, fontSize * 0.035 * charSpacing);
  const wordGap = fontSize * (0.28 + 0.08 * charSpacing) * wordSpacing;
  const rawGlyphWidth = glyphs.reduce((sum, glyph) => sum + ctx.measureText(glyph).width, 0);
  const trackedWordWidth = isSpace ? 0 : ctx.measureText(token).width + tracking * Math.max(0, glyphs.length - 1);
  return {
    isSpace,
    glyphs,
    tracking,
    rawGlyphWidth,
    width: isSpace ? ctx.measureText(' ').width + wordGap : trackedWordWidth,
  };
}

function fitSpiral(ctx, text, startRadius, maxRadius, requestedFontSize, ringGap, fontFamily, charSpacing = 1, wordSpacing = 1.45) {
  const clean = normalizeLyricText(text);
  if (!clean) return { text: '', fontSize: requestedFontSize, pitch: ringGap };
  const pitch = ringGap;
  ctx.font = '600 ' + requestedFontSize + 'px ' + fontFamily;
  const radiusAt = (angle) => startRadius + pitch * (angle + Math.PI / 2) / (Math.PI * 2);
  const fits = (candidate) => {
    let angle = -Math.PI / 2;
    const tokens = candidate.match(/\s+|\S+/g) || [];
    for (const token of tokens) {
      const layout = spiralTokenLayout(ctx, token, requestedFontSize, charSpacing, wordSpacing);
      const radius = radiusAt(angle);
      if (radius > maxRadius || radius < startRadius) return false;
      angle += layout.width / Math.max(radius, 1);
    }
    return true;
  };
  if (fits(clean)) return { text: clean, fontSize: requestedFontSize, pitch };

  // Keep the selected字号 exact and shorten only at complete sentence boundaries.
  const sentences = [...clean.matchAll(/[^.!?。！？;；]+[.!?。！？;；]+["'’”)]*|[^.!?。！？;；]+$/g)]
    .map((match) => match[0].trim())
    .filter(Boolean);
  const selected = [];
  for (const sentence of sentences) {
    const candidate = [...selected, sentence].join(' ');
    if (selected.length && !fits(candidate)) break;
    selected.push(sentence);
  }
  return { text: (selected.join(' ') || sentences[0] || clean).trim(), fontSize: requestedFontSize, pitch };
}

function drawSpiralText(ctx, fitted, startRadius, maxRadius, centerX, centerY, color, fontFamily, charSpacing = 1, wordSpacing = 1.45, spiralDirection = 'inside-out') {
  if (!fitted.text) return;
  ctx.fillStyle = color;
  ctx.font = '600 ' + fitted.fontSize + 'px ' + fontFamily;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let angle = -Math.PI / 2;
  const tokens = fitted.text.match(/\s+|\S+/g) || [];
  const radiusAt = (currentAngle) => {
    const distance = fitted.pitch * (currentAngle + Math.PI / 2) / (Math.PI * 2);
    return spiralDirection === 'outside-in' ? maxRadius - distance : startRadius + distance;
  };

  for (const token of tokens) {
    const layout = spiralTokenLayout(ctx, token, fitted.fontSize, charSpacing, wordSpacing);
    const { isSpace, glyphs, tracking, rawGlyphWidth, width: tokenWidth } = layout;
    const radius = radiusAt(angle);
    if (radius > maxRadius || radius < startRadius) break;
    const advance = tokenWidth / Math.max(radius, 1);
    const drawAngle = angle + advance / 2;
    const drawRadius = radiusAt(drawAngle);
    if (!isSpace && drawRadius <= maxRadius && drawRadius >= startRadius) {
      let glyphOffset = 0;
      const glyphScale = tokenWidth / Math.max(rawGlyphWidth, 1);
      for (const glyph of glyphs) {
        const glyphWidth = ctx.measureText(glyph).width;
        const glyphAdvance = glyphWidth * glyphScale;
        const glyphAngle = angle + (glyphOffset + glyphAdvance / 2) / Math.max(radius, 1);
        const glyphRadius = radiusAt(glyphAngle);
        if (glyphRadius > maxRadius || glyphRadius < startRadius) break;
        const x = centerX + Math.cos(glyphAngle) * glyphRadius;
        const y = centerY + Math.sin(glyphAngle) * glyphRadius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(glyphAngle + Math.PI / 2);
        ctx.fillText(glyph, 0, 0);
        ctx.restore();
        glyphOffset += glyphAdvance;
      }
    }
    angle += advance;
  }
}

export async function renderPoster(canvas, settings) {
  const {
    width, height, cover, title, artist, lyrics, paper, disc, ink, accent,
    fontFamily, ringSize, ringGap, charSpacing, wordSpacing = 1.45, lyricSize, titleSize, artistSize, releaseDateSize, releaseDateY = 84, titleY, artistY,
    showBarcode, trackUri, albumName, releaseDate, durationMs, barcodeY,
    playerStyle, playerScale, coverEffect, centerStyle, trackNumber,
    spiralDirection, lyricsBackgroundShape,
  } = settings;
  const scale = width / BASE_WIDTH;
  const logicalHeight = height / scale;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  await document.fonts.load('600 20px ' + fontFamily);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, BASE_WIDTH, logicalHeight);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, BASE_WIDTH, logicalHeight);

  const artworkX = BASE_WIDTH / 2;
  const posterAspect = logicalHeight / BASE_WIDTH;
  const compactLayout = posterAspect <= 1.3;
  // Compact formats (especially 4:5) have less height but currently leave a
  // large unused band before the title. Move the artwork down slightly so
  // the lyric disc can use that space without colliding with the metadata.
  const artworkY = logicalHeight * (compactLayout ? 0.39 : 0.378);
  const circleRadius = ringSize * 1.05 * (compactLayout ? 0.97 : 1);
  const centerRadius = centerStyle === 'cover' ? circleRadius : ringSize;
  // `ringGap` is the user-facing empty space. Add half a glyph height so the
  // curved letterforms themselves cannot visually touch the record edge.
  const lyricClearance = Math.max(8, lyricSize * 0.55);
  const ringStart = centerRadius + ringGap + lyricClearance;
  const maxRingRadius = Math.min(535, artworkY - (compactLayout ? 72 : 105), logicalHeight * (compactLayout ? 0.74 : 0.7)) - lyricClearance;
  const fitted = fitSpiral(ctx, lyrics, ringStart, maxRingRadius, lyricSize, ringGap, fontFamily, charSpacing, wordSpacing);

  drawLyricsBackground(ctx, lyricsBackgroundShape || 'circle', artworkX, artworkY, maxRingRadius, disc || mixHex(paper, accent, 0.18));
  let coverImage = null;
  try {
    coverImage = await loadImage(cover);
  } catch {}
  if (centerStyle === 'cover' && coverImage) {
    drawCoverShadow(ctx, artworkX, artworkY, circleRadius, ink);
    drawCover(ctx, coverImage, artworkX, artworkY, circleRadius, coverEffect);
  } else {
    drawRecordLabel(ctx, artworkX, artworkY, centerRadius, accent, ink, paper);
  }
  drawSpiralText(ctx, fitted, ringStart, maxRingRadius, artworkX, artworkY, ink, fontFamily, charSpacing, wordSpacing, spiralDirection);
  drawTonearm(ctx, playerStyle, artworkX, artworkY, maxRingRadius, playerScale, paper, ink, accent);

  const titlePosition = logicalHeight * ((titleY - (compactLayout ? 0.5 : 1.5)) / 100);
  const artistPosition = logicalHeight * ((artistY - (compactLayout ? 1.8 : 2.2)) / 100);
  const releaseDatePosition = logicalHeight * ((releaseDateY - (compactLayout ? 0.8 : 0)) / 100);
  const songTitle = title || 'Your song title';
  const artistName = artist || 'Artist name';
  const duration = durationMs ? formatDuration(durationMs) : '';

  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  const fittedTitleSize = fitTextSize(ctx, songTitle, titleSize, 900, fontFamily);
  ctx.font = '700 ' + fittedTitleSize + 'px ' + fontFamily;
  ctx.fillText(songTitle, artworkX, titlePosition);
  ctx.font = '600 ' + artistSize + 'px ' + fontFamily;
  ctx.fillStyle = ink + 'cf';
  ctx.fillText(artistName, artworkX, artistPosition);
  const albumMeta = [albumName, releaseDate, duration].filter(Boolean).join(' · ');
  if (albumMeta) {
    ctx.font = '500 ' + Math.max(16, releaseDateSize) + 'px ' + fontFamily;
    ctx.fillStyle = ink + 'c0';
    ctx.fillText(albumMeta, artworkX, releaseDatePosition);
  }
  if (showBarcode) {
    const codeY = logicalHeight * ((barcodeY + (compactLayout ? -1 : 0)) / 100);
    const codeCenterX = artworkX;
    const codeWidth = 284;
    const codeHeight = 79;
    const drawn = await drawSpotifyCode(ctx, trackUri, codeCenterX - codeWidth / 2, codeY, codeWidth, codeHeight, paper, ink);
    if (!drawn) drawFallbackBarcode(ctx, trackUri || title || 'song', codeCenterX - 120, codeY + 10, 240, 59, ink);
  }
}

export default function CanvasPoster({ settings, onRendered }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const nextCanvas = document.createElement('canvas');
    renderPoster(nextCanvas, settings).then(() => {
      if (cancelled) return;
      const visibleCanvas = canvasRef.current;
      visibleCanvas.width = nextCanvas.width;
      visibleCanvas.height = nextCanvas.height;
      visibleCanvas.getContext('2d').drawImage(nextCanvas, 0, 0);
      onRendered(nextCanvas.toDataURL('image/png'), nextCanvas);
    });
    return () => { cancelled = true; };
  }, [settings, onRendered]);
  return <canvas ref={canvasRef} className="poster-canvas" aria-hidden="true" />;
}
