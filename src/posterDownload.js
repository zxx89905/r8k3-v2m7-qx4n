import { encodeRgbTiff } from './tiffExport.js';

export function createPosterDownload({ format, canvas, filename, dpi = 300, createObjectURL = URL.createObjectURL }) {
  if (!canvas || !filename) return null;
  if (format === 'jpeg') {
    return {
      href: canvas.toDataURL('image/jpeg', 0.95),
      filename,
      revoke: false,
    };
  }
  if (format !== 'tiff') return null;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const bytes = encodeRgbTiff({ width: canvas.width, height: canvas.height, rgba, dpi });
  const blob = new Blob([bytes], { type: 'image/tiff' });
  return {
    href: createObjectURL(blob),
    filename,
    revoke: true,
  };
}
