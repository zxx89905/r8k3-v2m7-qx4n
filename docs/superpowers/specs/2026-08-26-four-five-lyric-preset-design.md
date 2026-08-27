# 4:5 Lyric Layout Preset Design

## Goal

Extend the existing 4:5 layout preset with the five circle-lyric values supplied in the user's screenshot.

## Behavior

Selecting 4:5 applies these additional settings:

- `ringSize: 160`
- `ringGap: 39`
- `lyricSize: 20`
- `charSpacing: 1.2`
- `wordSpacing: 1.25`

These keys live in the existing `four-five` object alongside its seven metadata layout settings. The existing size-change merge remains unchanged, and all other size presets remain unchanged.

## Testing

Update the 4:5 source assertion to require all five lyric settings and all seven metadata settings in one preset. Observe the focused test fail before changing application code, then run the focused test, complete test suite, and production build after implementation.
