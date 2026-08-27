function safeFilename(value) {
  return (String(value || 'song')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .trim() || 'song');
}

export function createPosterDownload({ format, pngUrl, canvas, title }) {
  if (!pngUrl) return null;
  const isJpeg = format === 'jpeg';
  if (isJpeg && !canvas) return null;
  return {
    href: isJpeg ? canvas.toDataURL('image/jpeg', 0.95) : pngUrl,
    filename: `${safeFilename(title)} - lyric circle.${isJpeg ? 'jpg' : 'png'}`,
  };
}
