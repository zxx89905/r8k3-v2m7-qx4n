import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, ChevronDown, Disc3, Download, ExternalLink,
  LoaderCircle, Music2, Palette, Search, Sparkles, Upload,
} from 'lucide-react';
import { getAlbum, getLyrics, searchAlbums } from './spotify';
import CanvasPoster from './CanvasPoster';
import { extractPosterPaletteVariants, sampleImagePixels } from './colorUtils';

const defaultLyrics = 'Add or edit the song lyrics here.';
const ACCESS_STORAGE_KEY = 'songform-access-granted';
const sizes = [
  { id: 'a4', name: 'A4 竖版', width: 2480, height: 3508 },
  { id: 'two-three', name: '2:3 竖版', width: 2400, height: 3600 },
  { id: 'three-four', name: '3:4 竖版', width: 2400, height: 3200 },
  { id: 'four-five', name: '4:5 竖版', width: 2400, height: 3000 },
  { id: 'square', name: '正方形尺寸', width: 3000, height: 3000 },
];
const sizeLayoutPresets = {
  a4: { ringSize: 160, ringGap: 42, charSpacing: 1.3, wordSpacing: 1.3, lyricSize: 22 },
  'three-four': { ringSize: 160, ringGap: 38, charSpacing: 1.3, wordSpacing: 1.2, lyricSize: 21 },
  'four-five': { ringSize: 160, ringGap: 39, charSpacing: 1.2, wordSpacing: 1.25, lyricSize: 20, titleSize: 60, titleY: 81, artistSize: 40, artistY: 87.5, releaseDateSize: 26, releaseDateY: 91, barcodeY: 93 },
  square: { ringSize: 160, ringGap: 42, charSpacing: 1.3, wordSpacing: 1.3, lyricSize: 22, titleSize: 62, titleY: 79, artistSize: 40, artistY: 85, releaseDateSize: 24, releaseDateY: 87.5, barcodeY: 90.5 },
};
const palettes = [
  { name: '畅销暖白', paper: '#f7f2e8', disc: '#e6ddd0', ink: '#1d1918', accent: '#c44732' },
  { name: '黑金典藏', paper: '#11100e', disc: '#242019', ink: '#f1d99b', accent: '#c69b52' },
  { name: '酒红柔粉', paper: '#f8eeee', disc: '#ead5d9', ink: '#641f32', accent: '#d58b93' },
  { name: '藏蓝香槟', paper: '#eef1f3', disc: '#d6dfe8', ink: '#172a46', accent: '#c7a05a' },
  { name: '墨绿金色', paper: '#eef1e9', disc: '#d6ded1', ink: '#173f35', accent: '#b8894f' },
  { name: '钴蓝明黄', paper: '#f3f2e9', disc: '#dbe4e8', ink: '#174a7a', accent: '#e2ac30' },
  { name: '赤陶海军蓝', paper: '#f5eee8', disc: '#dfd8d0', ink: '#18354a', accent: '#c66a4a' },
  { name: '樱桃奶油', paper: '#fff7ec', disc: '#f0ded5', ink: '#791f2d', accent: '#e0564a' },
  { name: '蓝灰珊瑚', paper: '#edf1f2', disc: '#d7e0e2', ink: '#2e4554', accent: '#e06b5f' },
  { name: '紫灰柠檬', paper: '#f3f0f4', disc: '#dfd9e4', ink: '#443a57', accent: '#d4b933' },
  { name: '摩卡奶油', paper: '#f4eee5', disc: '#ded4c7', ink: '#3e2923', accent: '#b86b4b' },
  { name: '极简黑白', paper: '#ffffff', disc: '#e8e8e8', ink: '#111111', accent: '#777777' },
];

const previewFrames = [
  { id: 'none', name: '无相框' },
  { id: 'black', name: '哑光黑框' },
  { id: 'white', name: '极简白框' },
  { id: 'oak', name: '浅木色框' },
  { id: 'walnut', name: '胡桃木框' },
  { id: 'gold', name: '香槟金框' },
  { id: 'silver', name: '拉丝银框' },
  { id: 'espresso', name: '深咖啡窄框' },
  { id: 'museum', name: '博物馆卡纸框' },
  { id: 'acrylic', name: '透明亚克力框' },
];

const siteThemes = [
  {
    id: 'sage', name: '鼠尾草绿', vars: {
      '--ui-bg': '#e8e6df', '--ui-topbar': 'rgba(232,230,223,.94)', '--ui-surface': '#f3f1ea', '--ui-input': '#fffefa', '--ui-stage': '#dcded5', '--ui-border': '#d2d3ca', '--ui-border-strong': '#c4c9c0', '--ui-control-border': '#d3d5cb', '--ui-text': '#1e2925', '--ui-heading': '#243b31', '--ui-muted': '#607068', '--ui-faint': '#859089', '--ui-accent': '#d45b3e', '--ui-brand': '#244238', '--ui-highlight': '#e6e6de',
    },
  },
  {
    id: 'midnight', name: '夜墨金', vars: {
      '--ui-bg': '#171818', '--ui-topbar': 'rgba(23,24,24,.94)', '--ui-surface': '#202323', '--ui-input': '#2a2d2d', '--ui-stage': '#111313', '--ui-border': '#363b39', '--ui-border-strong': '#4a514d', '--ui-control-border': '#414846', '--ui-text': '#f0e9d5', '--ui-heading': '#f3d89a', '--ui-muted': '#b3b0a2', '--ui-faint': '#888b83', '--ui-accent': '#d2a85b', '--ui-brand': '#b8863c', '--ui-highlight': '#303532',
    },
  },
  {
    id: 'terracotta', name: '陶土奶油', vars: {
      '--ui-bg': '#efe4d8', '--ui-topbar': 'rgba(239,228,216,.94)', '--ui-surface': '#f8f0e7', '--ui-input': '#fffaf3', '--ui-stage': '#e4d4c5', '--ui-border': '#d8c5b2', '--ui-border-strong': '#cdb29d', '--ui-control-border': '#dcc9b7', '--ui-text': '#33231e', '--ui-heading': '#673d2c', '--ui-muted': '#816b5e', '--ui-faint': '#a18879', '--ui-accent': '#c56043', '--ui-brand': '#71402e', '--ui-highlight': '#eee0d2',
    },
  },
  {
    id: 'navy', name: '藏蓝珊瑚', vars: {
      '--ui-bg': '#e7edf0', '--ui-topbar': 'rgba(231,237,240,.94)', '--ui-surface': '#f1f5f6', '--ui-input': '#ffffff', '--ui-stage': '#d5e0e5', '--ui-border': '#c5d2d9', '--ui-border-strong': '#afc0c9', '--ui-control-border': '#c7d5db', '--ui-text': '#182d3a', '--ui-heading': '#1b4356', '--ui-muted': '#58717c', '--ui-faint': '#80949c', '--ui-accent': '#e06b5f', '--ui-brand': '#1b4356', '--ui-highlight': '#dce8ec',
    },
  },
  {
    id: 'lavender', name: '雾紫黄油', vars: {
      '--ui-bg': '#eeeaf1', '--ui-topbar': 'rgba(238,234,241,.94)', '--ui-surface': '#f7f3f7', '--ui-input': '#fffdf8', '--ui-stage': '#e1dce7', '--ui-border': '#d2cbd9', '--ui-border-strong': '#c2b8cc', '--ui-control-border': '#d6cfdd', '--ui-text': '#302938', '--ui-heading': '#514065', '--ui-muted': '#766c80', '--ui-faint': '#9a8fa3', '--ui-accent': '#c99b3f', '--ui-brand': '#514065', '--ui-highlight': '#e9e2ed',
    },
  },
];

function NumericControl({ id, label, min, max, step = 1, value, onChange }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  const clamp = (next) => Math.min(max, Math.max(min, next));
  const commit = (raw) => {
    if (raw === '' || raw === '-' || raw === '.') {
      setDraft(String(value ?? ''));
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value ?? ''));
      return;
    }
    const next = clamp(parsed);
    setDraft(String(next));
    onChange(next);
  };

  const handleNumberChange = (event) => {
    const raw = event.target.value;
    setDraft(raw);
  };

  return <div className="field-group"><label htmlFor={id}>{label}</label><div className="range-with-value"><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => commit(event.target.value)} /><input type="number" min={min} max={max} step={step} value={draft} onChange={handleNumberChange} onBlur={(event) => commit(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(event.currentTarget.value); event.currentTarget.blur(); } }} aria-label={label + '数值'} /></div></div>;
}

function selectCompleteLyrics(text, limit) {
  const clean = (text || '').trim();
  if (!Number.isFinite(limit) || clean.length <= limit) return clean;
  const lines = clean.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    const selected = [];
    let length = 0;
    for (const line of lines) {
      const nextLength = length + line.length + (selected.length ? 1 : 0);
      if (selected.length && nextLength > limit) break;
      selected.push(line);
      length = nextLength;
    }
    return selected.join('\n');
  }
  const candidates = [...clean.matchAll(/[^.!?。！？;；]+[.!?。！？;；]+["'’”)]*|[^.!?。！？;；]+$/g)]
    .map((match) => match[0].trim())
    .filter(Boolean);
  const selected = [];
  let length = 0;
  for (const sentence of candidates) {
    const nextLength = length + sentence.length + (selected.length ? 1 : 0);
    if (selected.length && nextLength > limit) break;
    selected.push(sentence);
    length = nextLength;
  }
  return selected.join(' ');
}

function parseDuration(value) {
  const parts = String(value || '').trim().split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0;
  const seconds = parts.length === 1 ? parts[0] : parts.slice(-2).reduce((minutes, seconds) => minutes * 60 + seconds);
  return Math.max(0, seconds * 1000);
}

function normalizeSpotifyUri(value) {
  const clean = String(value || '').trim();
  if (clean.startsWith('spotify:track:')) return clean;
  const match = clean.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  return match ? 'spotify:track:' + match[1] : '';
}

function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(ACCESS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [creationMode, setCreationMode] = useState('spotify');
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [posterTitle, setPosterTitle] = useState('');
  const [posterArtist, setPosterArtist] = useState('');
  const [lyrics, setLyrics] = useState(defaultLyrics);
  const [lyricsLengthMode, setLyricsLengthMode] = useState('balanced');
  const [lyricsSource, setLyricsSource] = useState('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [image, setImage] = useState('');
  const [status, setStatus] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  // Keep the calibrated A4 look as the first-run poster preset.
  const [palette, setPalette] = useState(palettes[7]);
  const [siteTheme, setSiteTheme] = useState(siteThemes[0].id);
  const [customCover, setCustomCover] = useState('');
  const [isAutoColoring, setIsAutoColoring] = useState(false);
  const [paletteStatus, setPaletteStatus] = useState('');
  const [paletteRecommendations, setPaletteRecommendations] = useState([]);
  const [previewFrame, setPreviewFrame] = useState('none');
  useEffect(() => () => {
    if (customCover?.startsWith('blob:')) URL.revokeObjectURL(customCover);
  }, [customCover]);
  const [manualData, setManualData] = useState({
    title: '', artist: '', albumName: '', releaseDate: '', duration: '', spotifyUri: '', lyrics: defaultLyrics,
  });
  const [settings, setSettings] = useState({
    // Calibrated from the user's tuned A4 preview values.
    fontFamily: 'Montserrat', ...sizeLayoutPresets.a4, titleSize: 62, artistSize: 40, releaseDateSize: 24,
    titleY: 79, artistY: 85, releaseDateY: 87.5, barcodeY: 90.5,
    showBarcode: true,
    coverEffect: 'none', centerStyle: 'label', spiralDirection: 'inside-out', lyricsBackgroundShape: 'circle',
    playerStyle: 'retro', playerScale: 1,
  });
  const [sizeId, setSizeId] = useState('a4');

  const activeLyrics = creationMode === 'manual' ? manualData.lyrics : lyrics;
  const posterLyrics = useMemo(() => {
    const limits = { highlight: 600, balanced: 1200, extended: 1800, full: Infinity };
    return selectCompleteLyrics(activeLyrics, limits[lyricsLengthMode]);
  }, [activeLyrics, lyricsLengthMode]);

  const manualTrackUri = normalizeSpotifyUri(manualData.spotifyUri);
  const activeTrackUri = creationMode === 'manual' ? manualTrackUri : selectedTrack?.uri;
  const previewReady = creationMode === 'manual' || Boolean(selectedAlbum);

  const posterSettings = useMemo(() => ({
    ...sizes.find((item) => item.id === sizeId),
    ...settings,
    cover: customCover || (creationMode === 'spotify' ? selectedAlbum?.images?.[0]?.url : ''),
    title: creationMode === 'manual' ? manualData.title : posterTitle || selectedTrack?.name,
    artist: creationMode === 'manual' ? manualData.artist : posterArtist || selectedAlbum?.artists?.map((artist) => artist.name).join(', '),
    albumName: creationMode === 'manual' ? manualData.albumName : selectedAlbum?.name,
    releaseDate: creationMode === 'manual' ? manualData.releaseDate : selectedAlbum?.release_date,
    durationMs: creationMode === 'manual' ? parseDuration(manualData.duration) : selectedTrack?.duration_ms,
    trackNumber: creationMode === 'manual' ? 1 : selectedTrack?.track_number,
    lyrics: posterLyrics,
    paper: palette.paper,
    disc: palette.disc,
    ink: palette.ink,
    accent: palette.accent,
    trackUri: activeTrackUri,
    barcodeEnabled: settings.showBarcode,
    showBarcode: settings.showBarcode && Boolean(activeTrackUri),
  }), [customCover, creationMode, manualData, selectedAlbum, selectedTrack, posterTitle, posterArtist, posterLyrics, palette, settings, sizeId, activeTrackUri]);


  const handleRendered = useCallback((url) => setImage(url), []);

  const handleSearch = async (event) => {
    event?.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setStatus('');
    try {
      setAlbums(await searchAlbums(query.trim()));
    } catch (error) {
      setStatus('搜索失败，请检查网络或 Spotify 配置。');
    } finally {
      setIsSearching(false);
    }
  };

  const loadTrackLyrics = async (album, track) => {
    if (!track) return;
    setIsLoadingLyrics(true);
    try {
      const result = await getLyrics(track, album);
      setLyrics(result.lyrics || defaultLyrics);
      setLyricsSource(result.source || '');
    } catch {
      setLyricsSource('');
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const chooseAlbum = async (album) => {
    setIsLoadingAlbum(true);
    setStatus('');
    try {
      const detail = await getAlbum(album.id);
      setSelectedAlbum(detail);
      const firstTrack = detail.tracks?.items?.[0] ?? null;
      setSelectedTrack(firstTrack);
      setPosterTitle(firstTrack?.name || '');
      setPosterArtist(detail.artists?.map((artist) => artist.name).join(', ') || '');
      await loadTrackLyrics(detail, firstTrack);
    } catch (error) {
      setStatus('专辑信息加载失败，请稍后重试。');
    } finally {
      setIsLoadingAlbum(false);
    }
  };

  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  function handleSizeChange(nextSizeId) {
    setSizeId(nextSizeId);
    const preset = sizeLayoutPresets[nextSizeId];
    if (preset) setSettings((current) => ({ ...current, ...preset }));
  }
  const updateManualData = (key, value) => setManualData((current) => ({ ...current, [key]: value }));
  const handleCoverUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomCover(URL.createObjectURL(file));
      setPaletteStatus('封面已更新，可以识别配色。');
    }
  };
  const handleAutoPalette = () => {
    const coverUrl = customCover || (creationMode === 'spotify' ? selectedAlbum?.images?.[0]?.url : '');
    if (!coverUrl) {
      setPaletteStatus('请先选择歌曲或上传一张封面。');
      return;
    }
    setIsAutoColoring(true);
    setPaletteStatus('正在读取封面颜色…');
    const imageElement = new Image();
    imageElement.crossOrigin = 'anonymous';
    imageElement.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(imageElement, 0, 0, size, size);
        const pixels = sampleImagePixels(context.getImageData(0, 0, size, size), 3);
        const recommendations = extractPosterPaletteVariants(pixels);
        setPaletteRecommendations(recommendations);
        setPalette(recommendations[0]);
        setPaletteStatus('已生成 3 套封面推荐配色。');
      } catch {
        setPaletteStatus('封面无法读取颜色，请上传本地图片后重试。');
      } finally {
        setIsAutoColoring(false);
      }
    };
    imageElement.onerror = () => {
      setIsAutoColoring(false);
      setPaletteStatus('封面加载失败，请上传本地图片后重试。');
    };
    imageElement.src = coverUrl;
  };
  const handleFontUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fontName = 'UploadedPosterFont';
    const font = new FontFace(fontName, await file.arrayBuffer());
    await font.load();
    document.fonts.add(font);
    updateSetting('fontFamily', fontName);
  };
  const changeTrack = async (trackId) => {
    const track = selectedAlbum.tracks.items.find((item) => item.id === trackId);
    setSelectedTrack(track);
    setPosterTitle(track?.name || '');
    await loadTrackLyrics(selectedAlbum, track);
  };

  const downloadPoster = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = ((creationMode === 'manual' ? manualData.title : selectedTrack?.name) || 'song') + ' - lyric circle.png';
    link.click();
  };

  const activeSiteTheme = siteThemes.find((item) => item.id === siteTheme) || siteThemes[0];

  const handleVisualUnlock = () => {
    try {
      sessionStorage.setItem(ACCESS_STORAGE_KEY, 'true');
    } catch {}
    setIsUnlocked(true);
  };

  if (!isUnlocked) {
    return <div className="access-gate" style={siteThemes[0].vars}><div className="access-gate-brand"><span className="brand-mark"><Disc3 size={21} /></span><span>songform</span></div><div className="access-gate-art"><img src="./access-gate.svg" alt="" draggable="false" /><button className="access-hotspot" type="button" onClick={handleVisualUnlock} aria-label="进入 Songform" /></div></div>;
  }

  return (
    <div className={'app-shell theme-' + activeSiteTheme.id} style={activeSiteTheme.vars}>
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark"><Disc3 size={21} /></span><span>songform</span></a>
        <div className="topbar-tools"><div className="theme-picker" role="group" aria-label="网页主题"><span className="theme-label">主题</span><div className="theme-swatches">{siteThemes.map((item) => <button key={item.id} type="button" className={'theme-swatch theme-swatch-' + item.id + (siteTheme === item.id ? ' is-active' : '')} style={{ background: item.vars['--ui-brand'] }} onClick={() => setSiteTheme(item.id)} aria-label={item.name} title={item.name}><span style={{ background: item.vars['--ui-accent'] }} /></button>)}</div></div><div className="topbar-meta"><span className="status-dot" /> 把喜欢的歌做成一张海报</div></div>
      </header>

      <main>
        <section className="intro-band">
          <div className="hero-copy-block">
            <p className="eyebrow"><Sparkles size={14} /> SONGFORM STUDIO / 音乐视觉工作室</p>
            <h1>把一首歌，<em>做成一张值得被收藏的海报。</em></h1>
            <p className="intro-copy">从 Spotify 专辑到圆圈歌词排版，把一首歌的情绪、节奏和记忆，整理成一张真正属于你的视觉作品。</p>
            <div className="hero-actions"><a className="hero-primary" href="#editor">开始制作海报 <ArrowUpRight size={16} /></a><a className="hero-secondary" href="#capabilities">浏览创作能力 <span>03</span></a></div>
            <div className="hero-proof"><span className="proof-line" /> <span>实时生成 · 高清导出 · 预览相框</span></div>
          </div>
          <div className="hero-record" aria-hidden="true">
            <div className="hero-record-glow" />
            <div className="hero-record-disc"><span className="hero-record-groove groove-one" /><span className="hero-record-groove groove-two" /><span className="hero-record-label">SF<br /><small>STUDIO</small></span></div>
            <div className="hero-record-card"><span>SONGFORM</span><strong>MAKE IT<br />YOURS.</strong><small>LYRIC POSTER / 2026</small></div>
            <p className="hero-record-caption">A visual language<br />for the songs you keep.</p>
          </div>
          <div className="capability-rail" id="capabilities">
            <div className="capability"><span>01</span><strong>智能取数</strong><p>专辑、歌曲与歌词，一次整理。</p></div>
            <div className="capability"><span>02</span><strong>精细排版</strong><p>尺寸、字距、唱臂和色彩都能掌控。</p></div>
            <div className="capability"><span>03</span><strong>作品级输出</strong><p>高清 PNG 导出，预览相框不进入成品。</p></div>
          </div>
        </section>

        <section className="workspace" id="editor">
          <aside className="control-panel">
            <div className="panel-heading"><div><p className="section-kicker">海报设置</p><h2>编辑你的海报</h2></div><Music2 size={21} /></div>
            <div className="creation-mode" role="group" aria-label="制作方式"><button type="button" className={creationMode === 'spotify' ? 'is-active' : ''} onClick={() => setCreationMode('spotify')}><Search size={15} /> Spotify 自动</button><button type="button" className={creationMode === 'manual' ? 'is-active' : ''} onClick={() => setCreationMode('manual')}><Upload size={15} /> 手动制作</button></div>
            {creationMode === 'spotify' && <><form className="search-form" onSubmit={handleSearch}>
              <label htmlFor="song-search">搜索 Spotify 专辑或艺术家</label>
              <div className="search-row"><Search size={17} /><input id="song-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入专辑名或艺术家名" /><button type="submit" aria-label="搜索"><Search size={17} /></button></div>
            </form>
            <div className="quick-searches">{['The Weeknd', 'Taylor Swift', 'Frank Ocean'].map((item) => <button key={item} type="button" onClick={() => setQuery(item)}>{item}</button>)}</div>
            {isSearching && <p className="inline-status"><LoaderCircle className="spin" size={15} /> 正在搜索 Spotify...</p>}
            {status && <p className="inline-status error">{status}</p>}
            {!!albums.length && <div className="album-results"><div className="results-head"><span>专辑结果</span><span>共 {albums.length} 个</span></div>{albums.map((album) => <button className={'album-result ' + (selectedAlbum?.id === album.id ? 'is-selected' : '')} key={album.id} type="button" onClick={() => chooseAlbum(album)}><img src={album.images?.[2]?.url || album.images?.[0]?.url} alt="" /><span><strong>{album.name}</strong><small>{album.artists?.map((artist) => artist.name).join(', ')}</small></span><ChevronDown size={15} /></button>)}</div>}
            {isLoadingAlbum && <p className="inline-status"><LoaderCircle className="spin" size={15} /> 正在加载专辑和歌词...</p>}</>}

            {previewReady && <div className="editor-fields">
              <div className="field-group"><label htmlFor="size-select">海报尺寸</label><select id="size-select" value={sizeId} onChange={(event) => handleSizeChange(event.target.value)}>{sizes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.width}×{item.height}</option>)}</select></div>
              {creationMode === 'spotify' && <div className="field-group"><label htmlFor="track-select">选择歌曲</label><select id="track-select" value={selectedTrack?.id || ''} onChange={(event) => changeTrack(event.target.value)}>{selectedAlbum.tracks.items.map((track) => <option value={track.id} key={track.id}>{track.name}</option>)}</select></div>}
              {creationMode === 'manual' && <div className="manual-notice"><strong>离线手动制作</strong><span>所有内容直接在本机填写，不调用 Spotify 或歌词 API。</span></div>}
              <p className="control-subhead">歌曲文字</p>
              <div className="field-group"><label htmlFor="poster-title">歌曲名</label><input id="poster-title" value={creationMode === 'manual' ? manualData.title : posterTitle} onChange={(event) => creationMode === 'manual' ? updateManualData('title', event.target.value) : setPosterTitle(event.target.value)} placeholder={creationMode === 'manual' ? '输入歌曲名' : ''} /></div>
              <div className="field-grid"><NumericControl id="title-size" label="歌曲名字号" min={30} max={78} value={settings.titleSize} onChange={(value) => updateSetting('titleSize', value)} /><NumericControl id="title-y" label="歌曲名上下位置" min={62} max={86} value={settings.titleY} onChange={(value) => updateSetting('titleY', value)} /></div>
              <div className="field-group"><label htmlFor="poster-artist">歌手名</label><input id="poster-artist" value={creationMode === 'manual' ? manualData.artist : posterArtist} onChange={(event) => creationMode === 'manual' ? updateManualData('artist', event.target.value) : setPosterArtist(event.target.value)} placeholder={creationMode === 'manual' ? '输入歌手名' : ''} /></div>
              <div className="field-grid"><NumericControl id="artist-size" label="歌手名字号" min={22} max={52} value={settings.artistSize} onChange={(value) => updateSetting('artistSize', value)} /><NumericControl id="artist-y" label="歌手名上下位置" min={68} max={90} value={settings.artistY} onChange={(value) => updateSetting('artistY', value)} /></div>
              <div className="field-grid"><NumericControl id="release-date-size" label="发行日期字号" min={12} max={30} value={settings.releaseDateSize} onChange={(value) => updateSetting('releaseDateSize', value)} /><NumericControl id="release-date-y" label="发行日期上下位置" min={76} max={94} step={0.5} value={settings.releaseDateY} onChange={(value) => updateSetting('releaseDateY', value)} /></div>
              {creationMode === 'manual' && <><div className="field-grid"><div className="field-group"><label htmlFor="manual-album">专辑名</label><input id="manual-album" value={manualData.albumName} onChange={(event) => updateManualData('albumName', event.target.value)} placeholder="可选" /></div><div className="field-group"><label htmlFor="manual-date">发行日期</label><input id="manual-date" value={manualData.releaseDate} onChange={(event) => updateManualData('releaseDate', event.target.value)} placeholder="例如 2024-08-25" /></div></div><div className="field-grid"><div className="field-group"><label htmlFor="manual-duration">歌曲时长</label><input id="manual-duration" value={manualData.duration} onChange={(event) => updateManualData('duration', event.target.value)} placeholder="例如 3:45" /></div><div className="field-group"><label htmlFor="manual-spotify">Spotify 链接 / URI</label><input id="manual-spotify" value={manualData.spotifyUri} onChange={(event) => updateManualData('spotifyUri', event.target.value)} placeholder="可选，用于生成扫码条" /></div></div></>}
              <div className="field-group"><label htmlFor="lyrics">歌词内容</label><textarea id="lyrics" value={activeLyrics} onChange={(event) => { if (creationMode === 'manual') updateManualData('lyrics', event.target.value); else { setLyrics(event.target.value); setLyricsSource('手动编辑'); } }} rows={10} /><small className="field-help">{creationMode === 'manual' ? '直接粘贴歌词即可；换行会自动处理为空格。' : isLoadingLyrics ? '正在自动获取完整歌词...' : lyricsSource ? '歌词来源：' + lyricsSource + '。你可以继续修改后再导出。' : '没有自动匹配到歌词，可以在这里手动粘贴。'}</small></div>
              <div className="field-group"><label htmlFor="lyrics-length">海报使用多少歌词</label><select id="lyrics-length" value={lyricsLengthMode} onChange={(event) => setLyricsLengthMode(event.target.value)}><option value="highlight">精选片段 · 约 600 字符</option><option value="balanced">均衡排版 · 约 1200 字符</option><option value="extended">较多歌词 · 约 1800 字符</option><option value="full">完整歌词 · 使用全部内容</option></select><small className="field-help">海报将使用 {posterLyrics.length} / {activeLyrics.length} 个字符。</small></div>
              <div className="field-group"><div className="palette-heading"><label>一键热销配色</label><button type="button" className="auto-palette-button" onClick={handleAutoPalette} disabled={isAutoColoring}><Sparkles size={13} /> {isAutoColoring ? '识别中…' : '一键识别封面配色'}</button></div>{paletteRecommendations.length > 0 && <div className="palette-recommendations">{paletteRecommendations.map((item) => <button key={item.name} type="button" className={'palette-recommendation ' + (palette.name === item.name ? 'is-active' : '')} onClick={() => { setPalette(item); setPaletteStatus(''); }}><span className="recommendation-preview" style={{ background: item.paper }}><span className="recommendation-disc" style={{ background: item.disc }} /><span className="recommendation-accent" style={{ background: item.accent }} /></span><span><strong>{item.name}</strong><small>{item.accent}</small></span></button>)}</div>}<div className="palette-row">{palettes.map((item) => <button key={item.name} type="button" className={'palette-swatch ' + (palette.name === item.name ? 'is-active' : '')} style={{ background: item.paper }} onClick={() => { setPalette(item); setPaletteStatus(''); }} aria-label={item.name} title={item.name}><span className="swatch-disc" style={{ background: item.disc }} /><span className="swatch-ink" style={{ background: item.ink }} /><span className="swatch-accent" style={{ background: item.accent }} /></button>)}</div>{paletteStatus && <span className="palette-status" role="status">{paletteStatus}</span>}</div>
              <div className="field-group"><label htmlFor="font-family">海报字体</label><select id="font-family" value={settings.fontFamily} onChange={(event) => updateSetting('fontFamily', event.target.value)}><option>Montserrat</option><option>Inter</option><option>DM Sans</option><option>Space Grotesk</option><option>IBM Plex Sans</option><option>Georgia</option><option>Arial</option><option>Courier New</option><option>Trebuchet MS</option></select></div>
              <div className="field-grid"><div className="field-group"><label htmlFor="center-style">中心唱片样式</label><select id="center-style" value={settings.centerStyle} onChange={(event) => updateSetting('centerStyle', event.target.value)}><option value="label">纯色唱片标签 · 主推</option><option value="cover">圆形专辑封面</option></select></div><div className="field-group"><label htmlFor="spiral-direction">歌词旋转方向</label><select id="spiral-direction" value={settings.spiralDirection} onChange={(event) => updateSetting('spiralDirection', event.target.value)}><option value="inside-out">由内向外 · 阅读优先</option><option value="outside-in">由外向内 · 唱片方向</option></select></div></div>
              <div className="field-group"><label htmlFor="lyrics-background-shape">歌词背景</label><select id="lyrics-background-shape" value={settings.lyricsBackgroundShape} onChange={(event) => updateSetting('lyricsBackgroundShape', event.target.value)}><option value="circle">显示圆形浮雕底板</option><option value="none">不显示背景</option></select></div>
              {settings.centerStyle !== 'label' && <div className="field-group"><label htmlFor="cover-effect">封面质感</label><select id="cover-effect" value={settings.coverEffect} onChange={(event) => updateSetting('coverEffect', event.target.value)}><option value="none">原图</option><option value="grayscale(1) contrast(1.08)">黑白灰单色</option><option value="grayscale(1) contrast(1.42) brightness(.92)">高对比黑白</option><option value="saturate(.68) contrast(.94) brightness(1.06)">柔和褪色</option><option value="sepia(.34) saturate(1.14) contrast(1.04)">复古暖调</option><option value="grayscale(.42) sepia(.18) hue-rotate(170deg) saturate(.85)">冷调蓝灰</option></select></div>}
              <div className="field-grid"><div className="field-group"><label htmlFor="player-style">唱臂样式</label><select id="player-style" value={settings.playerStyle} onChange={(event) => updateSetting('playerStyle', event.target.value)}><option value="classic">画廊经典 · 粗黑弧臂</option><option value="minimal">极简直臂 · 粗线转轴</option><option value="retro">复古木座 · 黄铜唱臂</option><option value="studio">Hi-Fi S 型 · 金属唱臂</option><option value="none">不显示唱臂</option></select></div><NumericControl id="player-scale" label="唱臂大小" min={0.7} max={1.4} step={0.05} value={settings.playerScale} onChange={(value) => updateSetting('playerScale', value)} /></div>
              <div className="field-grid"><NumericControl id="ring-size" label="中心元素大小" min={130} max={250} value={settings.ringSize} onChange={(value) => updateSetting('ringSize', value)} /><NumericControl id="ring-gap" label="圈与圈行距" min={26} max={58} value={settings.ringGap} onChange={(value) => updateSetting('ringGap', value)} /></div>
              <div className="field-grid"><NumericControl id="lyric-size" label="歌词字号" min={8} max={25} value={settings.lyricSize} onChange={(value) => updateSetting('lyricSize', value)} /><NumericControl id="char-spacing" label="字母间距" min={0.8} max={1.8} step={0.05} value={settings.charSpacing} onChange={(value) => updateSetting('charSpacing', value)} /></div>
              <div className="field-group"><NumericControl id="word-spacing" label="词间距" min={1.1} max={2.2} step={0.05} value={settings.wordSpacing} onChange={(value) => updateSetting('wordSpacing', value)} /></div>
              <div className="field-grid"><div className="field-group"><label htmlFor="paper-color">海报背景色</label><input id="paper-color" type="color" value={palette.paper} onChange={(event) => setPalette((current) => ({ ...current, paper: event.target.value }))} /></div><div className="field-group"><label htmlFor="ink-color">歌词和文字颜色</label><input id="ink-color" type="color" value={palette.ink} onChange={(event) => setPalette((current) => ({ ...current, ink: event.target.value }))} /></div></div>
              <div className="field-grid"><div className="field-group"><label htmlFor="disc-color">唱片颜色</label><input id="disc-color" type="color" value={palette.disc} onChange={(event) => setPalette((current) => ({ ...current, disc: event.target.value }))} /></div><div className="field-group"><label htmlFor="accent-color">唱臂装饰颜色</label><input id="accent-color" type="color" value={palette.accent} onChange={(event) => setPalette((current) => ({ ...current, accent: event.target.value }))} /></div></div>
              <p className="control-subhead">扫码条与底部留白</p>
              <NumericControl id="barcode-y" label="扫码条上下位置" min={78} max={93} step={0.5} value={settings.barcodeY} onChange={(value) => updateSetting('barcodeY', value)} />
              <div className="field-actions"><label className="upload-control"><Upload size={15} /> 上传自定义封面（封面版 / 取色）<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverUpload} /></label><label className="upload-control"><Upload size={15} /> 上传 TTF / OTF 字体<input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} /></label><label className="toggle-control"><input type="checkbox" checked={settings.showBarcode} onChange={(event) => updateSetting('showBarcode', event.target.checked)} /><span /> 显示 Spotify 扫码条</label></div>
            </div>}
          </aside>

          <section className="preview-panel">
              <div className="preview-topline"><div><p className="section-kicker">实时预览</p><h2>{creationMode === 'manual' ? manualData.title || '手动制作海报' : selectedTrack ? selectedTrack.name : '先搜索并选择一首歌曲'}</h2></div><div className="preview-actions"><label className="frame-picker"><span>预览相框</span><select value={previewFrame} onChange={(event) => setPreviewFrame(event.target.value)} aria-label="预览相框">{previewFrames.map((frame) => <option value={frame.id} key={frame.id}>{frame.name}</option>)}</select></label><button className="download-button" type="button" onClick={downloadPoster} disabled={!image}><Download size={16} /> 下载高清 PNG</button></div></div>
              <div className="poster-stage">{previewReady ? <><div className={'preview-frame preview-frame-' + previewFrame}><img className="poster-image" src={image} alt="圆圈歌词海报预览" /></div><CanvasPoster settings={posterSettings} onRendered={handleRendered} /></> : <div className="empty-poster"><Palette size={31} /><p>选择歌曲后<br />这里会实时显示海报</p></div>}</div>
              <div className="preview-footer"><span><span className="mini-dot" /> {posterSettings.width} × {posterSettings.height} 像素 · 高清输出</span>{creationMode === 'spotify' && selectedTrack?.external_urls?.spotify && <a href={selectedTrack.external_urls.spotify} target="_blank" rel="noreferrer">在 Spotify 中打开 <ExternalLink size={13} /></a>}</div>
          </section>
        </section>
      </main>

      <footer className="site-footer"><span>SONGFORM / 圆圈歌词海报</span><span>把喜欢的歌词留在海报里。</span></footer>
    </div>
  );
}

export default App;
