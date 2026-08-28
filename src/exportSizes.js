const DEFAULT_EXPORT = { id: 'default', label: '默认输出' };

const PRINT_EXPORTS = [
  { id: 'a1', label: 'A1', group: 'a4', width: 2339, height: 3311, dpi: 100 },
  { id: 'a2', label: 'A2', group: 'a4', width: 1984, height: 2806, dpi: 120 },
  { id: 'a3', label: 'A3', group: 'a4', width: 1754, height: 2480, dpi: 150 },
  { id: 'a4', label: 'A4', group: 'a4', width: 1488, height: 2105, dpi: 180 },
  { id: '20x28', label: '20X28', group: 'a4', width: 2000, height: 2800, dpi: 100 },
  { id: '8x10', label: '8X10', group: 'four-five', width: 1440, height: 1800, dpi: 180 },
  { id: '9x11', label: '9X11', group: 'four-five', width: 1620, height: 1980, dpi: 180 },
  { id: '11x14', label: '11X14', group: 'four-five', width: 1650, height: 2100, dpi: 150 },
  { id: '16x20', label: '16X20', group: 'four-five', width: 1920, height: 2400, dpi: 120 },
  { id: '8x12', label: '8X12', group: 'two-three', width: 1440, height: 2160, dpi: 180 },
  { id: '10x15', label: '10X15', group: 'two-three', width: 1500, height: 2250, dpi: 150 },
  { id: '11x17', label: '11X17', group: 'two-three', width: 1650, height: 2550, dpi: 150 },
  { id: '12x18', label: '12X18', group: 'two-three', width: 1800, height: 2700, dpi: 150 },
  { id: '16x24', label: '16X24', group: 'two-three', width: 1920, height: 2880, dpi: 120 },
  { id: '20x30', label: '20X30', group: 'two-three', width: 2000, height: 3000, dpi: 100 },
  { id: '24x36', label: '24X36', group: 'two-three', width: 2400, height: 3600, dpi: 100 },
  { id: '27x40', label: '27X40', group: 'two-three', width: 2430, height: 3600, dpi: 90 },
  { id: '12x16', label: '12X16', group: 'three-four', width: 1800, height: 2400, dpi: 150 },
  { id: '18x24', label: '18X24', group: 'three-four', width: 2160, height: 2880, dpi: 120 },
  { id: '24x32', label: '24X32', group: 'three-four', width: 2400, height: 3200, dpi: 100 },
];

export function getExportSizesForPoster(posterSizeId) {
  return [DEFAULT_EXPORT, ...PRINT_EXPORTS.filter((item) => item.group === posterSizeId)];
}

export function resolveExportSize(exportSizeId, activeSize) {
  if (exportSizeId === 'default') {
    return {
      ...DEFAULT_EXPORT,
      width: Number(activeSize.width),
      height: Number(activeSize.height),
      dpi: 0,
    };
  }
  const match = PRINT_EXPORTS.find((item) => item.id === exportSizeId);
  if (!match) return null;
  const { group, ...exportSize } = match;
  return exportSize;
}

function safeFilename(value) {
  return (String(value || 'SONGFORM')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .trim() || 'SONGFORM');
}

export function buildExportFilename({ prefix, fallbackTitle, sizeLabel, format, framed = false }) {
  const base = safeFilename(prefix || fallbackTitle || 'SONGFORM');
  const normalizedSize = String(sizeLabel || '').toUpperCase();
  const sizeSuffix = normalizedSize && normalizedSize !== '默认输出' ? ` ${normalizedSize}` : '';
  const frameSuffix = framed ? ' 带框' : '';
  const extension = format === 'tiff' ? 'tif' : 'jpg';
  return `${base}${sizeSuffix}${frameSuffix}.${extension}`;
}
