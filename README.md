# Don't Feed The Geese

A small browser game made entirely in [Rive](https://rive.app). Somebody in the crowd has been
feeding the geese. Click (or pick up) people to get hints, find the feeder, and drop them in the pond.

The whole game lives in the Rive file; this repo is just a minimal page that shows it full-window.

**Play it:** https://richardbolland.github.io/DontFeedTheGeese/

## What's in here

| File | What it is |
|---|---|
| `index.html` | The page: a full-window canvas and a plain "Loading…" message. |
| `main.js` | Loads the Rive file and keeps it sized to the window. |
| `audio.js`, `audio/` | The sound effects: `audio.js` plays an mp3 from `audio/` whenever the game signals one (see `audio/README.txt`). |
| `dont-feed-the-geese.riv` | The game, exported from Rive (Export → For Runtime). |
| `vendor/rive.js`, `vendor/rive.wasm` | The Rive web runtime (`@rive-app/webgl2` 2.44.0, MIT), kept here so the site has no CDN dependency. |

## Updating the game

1. In the Rive editor, export the file for runtime (`.riv`).
2. Replace `dont-feed-the-geese.riv` with it (keep the same name).
3. Commit and push. GitHub Pages republishes automatically within a minute or two.

## Running it locally

The page needs to be served over HTTP (opening `index.html` directly won't load the `.riv`).
From this folder, either of these works:

```
python -m http.server 5173
npx serve .
```

then open http://localhost:5173.

## Notes

- **Responsive:** the Stage artboard is built with layouts, so it resizes to any window. On windows
  smaller than about 900 × 560 the whole scene scales down to fit (see `MIN_STAGE_WIDTH` /
  `MIN_STAGE_HEIGHT` in `main.js`); larger windows just get a bigger stage.
- **Input:** mouse and touch both work. Touch scrolling and zooming are disabled on the canvas so
  dragging people doesn't move the page.
- **Rive runtime:** the game uses Rive scripting and layouts, so it needs the `webgl2` runtime
  (not `canvas-lite`). If you update `vendor/`, keep those two files in step.
