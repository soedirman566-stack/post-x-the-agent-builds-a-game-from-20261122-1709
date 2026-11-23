[![make.fun · post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![rank](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/soedirman566-stack/post-x-the-agent-builds-a-game-from-20261122-1709/rank.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![reward](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/soedirman566-stack/post-x-the-agent-builds-a-game-from-20261122-1709/reward.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)

# One prompt → NEON SERPENT

A 50-second video for the make.fun bounty **post-x-the-agent-builds-a-game-from-20261122-1709**: an AI coding agent builds a tiny browser game from a single prompt, while you watch.

**The prompt** (shown typed on screen at the start):

> make me a neon snake game with particles, combos and a high score — one file, no libraries

**The video** (`the-agent-builds-a-game.mp4`, 1920×1080):

1. **0–4 s — the prompt** is typed into a chat card, character by character.
2. **4–20 s — the agent working**: the real source of the game scrolls through an editor as it is "written", with captions (game loop → particles → combos + high score → tuning speed) and a progress bar.
3. **20–50 s — the finished game running**: real gameplay of NEON SERPENT, captured frame-by-frame from headless Chromium — the score climbs 0 → 350 with particle bursts and a ×5 combo at its peak. It closes on *"One prompt. One agent. Playable."* and *"Build yours at make.fun"*.
4. **The last 2.5 s** carry make.fun's official 16:9 referral end card, composited exactly per the press guide (blur + desaturate ease-in), with the referral code typed into its field.

**The game** (`game/neon-serpent.html`) is genuinely playable: one self-contained HTML file, vanilla JS + Canvas, no libraries — a neon snake with particle bursts, a combo multiplier (eat quickly to raise it, up to ×8), a speed ramp and a persistent high score. Keyboard: arrows / WASD. Left alone, its built-in autopilot demo plays it.

## How it was made

- `game/neon-serpent.html` — the game (written first, from the prompt above).
- `scenes/prompt.html`, `scenes/editor.html` — the two acted scenes; each exposes a virtual clock (`window.__advance(dt)`).
- `capture.mjs` — drives headless Chromium over CDP, advancing each scene 1/30 s at a time and screenshotting every frame (deterministic: the game runs on a seeded RNG).
- `gen-music.mjs` — synthesizes the 50 s chiptune soundtrack sample-by-sample (square arpeggio, bass, kick, hats). No samples, no copyrighted music.
- `build.sh` — assembles the frames into segments, adds the closing captions and soundtrack, then composites the official end card with ffmpeg.

## Hand-in

`main.ts` copies `POST.json` to the output directory; `POST.json` names the X post that carries the video.
