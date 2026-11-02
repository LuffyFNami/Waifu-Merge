# Waifu Merge

A small browser-based merging game inspired by physics-based drop-and-merge games.

## Run
Open `index.html` in a modern browser. No build step or server is required. The game uses a custom lightweight circle-physics solver and has no external JavaScript dependencies. (The optional Google Font falls back to system fonts if offline.)

## Add your waifu sprites
Put square character portraits in `assets/waifus/` using these exact names:

- `tier-0.png`
- `tier-1.png`
- `tier-2.png`
- ...
- `tier-8.png`

PNG, JPG and WebP are supported by modern browsers; if you use another extension, update the image path in `game.js` inside `loadSprites()`.

**Image recommendations**
- Square crop, ideally 512×512 or larger.
- Character face/upper body centered, with a little margin around the head.
- Transparent PNG works particularly well.
- Keep the subject inside the circular crop; corners are clipped.
- Use art you own or have permission to use.

If a tier image is missing, the game automatically draws a cute placeholder avatar, so it remains playable.

## Controls
- Move pointer / touch: aim
- Click / tap / Space: drop
- Left / Right arrows: move aim
- R: restart

## Tuning
Open `game.js` and edit the `tiers` array to change:
- `r`: radius of each tier (in game pixels)
- `color`: fallback avatar color
- `points`: score awarded when a pair merges into that tier

Physics values are near the top of `physics()`:
- `gravity`: downward acceleration
- wall/floor restitution: bounce strength
- pair restitution: collision bounce
- friction: velocity damping

Best score is stored in browser local storage.
