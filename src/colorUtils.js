const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => clampByte(value).toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function mix(first, second, amount) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function luminance({ r, g, b }) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export function extractPosterPalette(pixels) {
  if (!Array.isArray(pixels) || pixels.length === 0) throw new Error('无法从封面提取颜色');

  const buckets = new Map();
  for (const pixel of pixels) {
    if (![pixel?.r, pixel?.g, pixel?.b].every(Number.isFinite)) continue;
    const color = { r: clampByte(pixel.r), g: clampByte(pixel.g), b: clampByte(pixel.b) };
    const lightness = luminance(color);
    if (lightness > 0.97 || lightness < 0.035) continue;
    const key = [Math.floor(color.r / 24), Math.floor(color.g / 24), Math.floor(color.b / 24)].join(':');
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, score: 0 };
    bucket.count += 1;
    bucket.r += color.r;
    bucket.g += color.g;
    bucket.b += color.b;
    bucket.score = bucket.count * (0.7 + saturation(color) * 0.3);
    buckets.set(key, bucket);
  }

  const winner = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
  if (!winner) throw new Error('无法从封面提取颜色');

  const dominant = {
    r: winner.r / winner.count,
    g: winner.g / winner.count,
    b: winner.b / winner.count,
  };
  const accent = rgbToHex(dominant);
  const paper = mix(accent, '#ffffff', 0.86);
  const disc = mix(accent, '#ffffff', 0.62);
  const ink = luminance(dominant) > 0.58 ? mix(accent, '#171b19', 0.68) : mix(accent, '#111514', 0.48);

  return { name: '封面自动配色', paper, disc, ink, accent };
}

export function extractPosterPaletteVariants(pixels) {
  const base = extractPosterPalette(pixels);
  return [
    { ...base, name: '原色氛围' },
    {
      name: '明亮编辑',
      paper: mix(base.accent, '#fffdf7', 0.92),
      disc: mix(base.accent, '#ffffff', 0.76),
      ink: mix(base.accent, '#1c211e', 0.62),
      accent: base.accent,
    },
    {
      name: '深色收藏',
      paper: mix(base.accent, '#101513', 0.78),
      disc: mix(base.accent, '#202b26', 0.58),
      ink: mix(base.accent, '#fff4df', 0.72),
      accent: mix(base.accent, '#e7a05d', 0.34),
    },
  ];
}

export function sampleImagePixels(imageData, step = 4) {
  const pixels = [];
  for (let index = 0; index < imageData.data.length; index += 4 * step) {
    pixels.push({ r: imageData.data[index], g: imageData.data[index + 1], b: imageData.data[index + 2] });
  }
  return pixels;
}
