# 4:5 Metadata Layout Preset Design

## Goal

When the poster size changes to 4:5, apply the metadata layout values captured in the user's screenshots without changing any entered song, artist, album, date, lyric, or Spotify data.

## Behavior

The 4:5 preset supplies only these settings:

- `titleSize: 60`
- `titleY: 81`
- `artistSize: 40`
- `artistY: 87.5`
- `releaseDateSize: 26`
- `releaseDateY: 91`
- `barcodeY: 93`

It does not supply lyric ring settings, text content, or unrelated visual controls. Existing A4 and 3:4 presets remain unchanged. The existing size-change handler continues to merge only the selected preset's keys into the current settings.

## Testing

Extend the size preset source test to require the exact 4:5 object. Run the focused test first to observe failure, then add the object and run the complete Node test suite and production build.
