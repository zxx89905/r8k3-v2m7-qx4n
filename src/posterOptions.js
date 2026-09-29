export const palettes = [
  { code: 'A', name: '暖白留声', paper: '#f8f3e8', disc: '#e8ddd0', ink: '#211b19', accent: '#c85a3e' },
  { code: 'B', name: '黑金典藏', paper: '#11100e', disc: '#242019', ink: '#f1d99b', accent: '#c69b52' },
  { code: 'C', name: '酒红柔粉', paper: '#faeff0', disc: '#ead4d8', ink: '#681f35', accent: '#c94f64' },
  { code: 'D', name: '藏蓝香槟', paper: '#eef1f5', disc: '#d5deeb', ink: '#1c3153', accent: '#c79f57' },
  { code: 'E', name: '墨绿金色', paper: '#eef2e9', disc: '#d5dfd1', ink: '#174336', accent: '#b88b4c' },
  { code: 'F', name: '橙色日落', paper: '#fff1df', disc: '#f3c391', ink: '#67301f', accent: '#e66b2e' },
  { code: 'G', name: '紫罗兰银灰', paper: '#f1eef7', disc: '#ddd5ea', ink: '#44345f', accent: '#8d62c7' },
  { code: 'H', name: '黑白极简', paper: '#fffdf8', disc: '#e7e5df', ink: '#171717', accent: '#555555' },
];

export const sizeLayoutPresets = {
  a4: { ringSize: 160, ringGap: 42, charSpacing: 1.3, wordSpacing: 1.3, lyricSize: 22 },
  'three-four': { ringSize: 160, ringGap: 38, charSpacing: 1.3, wordSpacing: 1.2, lyricSize: 21 },
  'four-five': { ringSize: 160, ringGap: 39, charSpacing: 1.2, wordSpacing: 1.25, lyricSize: 20, titleSize: 60, titleY: 81, artistSize: 40, artistY: 87.5, releaseDateSize: 26, releaseDateY: 91, barcodeY: 93 },
  square: {
    ringSize: 160,
    ringGap: 31,
    charSpacing: 1.2,
    wordSpacing: 1.1,
    lyricSize: 15,
    titleSize: 47,
    titleY: 81,
    artistSize: 35,
    artistY: 89,
    releaseDateSize: 22,
    releaseDateY: 94,
    barcodeY: 90.5,
    barcodeScale: 1,
    centerStyle: 'cover',
    coverEffect: 'none',
    playerStyle: 'minimal',
    playerScale: 1,
    showBarcode: false,
  },
};

export const tonearmOptions = [
  { value: 'minimal', label: '极简直臂 · 粗线转轴' },
  { value: 'retro', label: '复古木座 · 黄铜唱臂' },
  { value: 'none', label: '不显示唱臂' },
];

const portraitDefaults = {
  centerStyle: 'label',
  coverEffect: 'none',
  playerStyle: 'retro',
  playerScale: 1,
  showBarcode: true,
  barcodeScale: 1,
};

export function getSizeTransitionPreset(currentSizeId, nextSizeId) {
  const nextPreset = sizeLayoutPresets[nextSizeId] || {};
  return currentSizeId === 'square' && nextSizeId !== 'square'
    ? { ...portraitDefaults, ...nextPreset }
    : nextPreset;
}
