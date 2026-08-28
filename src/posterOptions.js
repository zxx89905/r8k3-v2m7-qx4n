export const palettes = [
  { code: 'A', name: '畅销暖白', paper: '#f7f2e8', disc: '#e6ddd0', ink: '#1d1918', accent: '#c44732' },
  { code: 'B', name: '黑金典藏', paper: '#11100e', disc: '#242019', ink: '#f1d99b', accent: '#c69b52' },
  { code: 'C', name: '酒红柔粉', paper: '#f8eeee', disc: '#ead5d9', ink: '#641f32', accent: '#d58b93' },
  { code: 'D', name: '藏蓝香槟', paper: '#eef1f3', disc: '#d6dfe8', ink: '#172a46', accent: '#c7a05a' },
  { code: 'E', name: '墨绿金色', paper: '#eef1e9', disc: '#d6ded1', ink: '#173f35', accent: '#b8894f' },
  { code: 'F', name: '钴蓝明黄', paper: '#f3f2e9', disc: '#dbe4e8', ink: '#174a7a', accent: '#e2ac30' },
  { code: 'G', name: '赤陶海军蓝', paper: '#f5eee8', disc: '#dfd8d0', ink: '#18354a', accent: '#c66a4a' },
  { code: 'H', name: '樱桃奶油', paper: '#fff7ec', disc: '#f0ded5', ink: '#791f2d', accent: '#e0564a' },
  { code: 'I', name: '蓝灰珊瑚', paper: '#edf1f2', disc: '#d7e0e2', ink: '#2e4554', accent: '#e06b5f' },
  { code: 'J', name: '紫灰柠檬', paper: '#f3f0f4', disc: '#dfd9e4', ink: '#443a57', accent: '#d4b933' },
  { code: 'K', name: '摩卡奶油', paper: '#f4eee5', disc: '#ded4c7', ink: '#3e2923', accent: '#b86b4b' },
  { code: 'L', name: '极简黑白', paper: '#ffffff', disc: '#e8e8e8', ink: '#111111', accent: '#777777' },
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
