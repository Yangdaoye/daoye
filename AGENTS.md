# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **dependency-free, vanilla JavaScript/HTML5 canvas browser game** ("校园坦克大战" / School Tank Battle). There is no package manager, no `package.json`, no lockfile, and no third-party dependencies. Node.js (used only for tests and the standalone build) and Python 3 (optional static server) are preinstalled; the update script is effectively a no-op.

### Running the game
- The game is pure client-side static files. Open `index.html` in a browser to play.
- To exercise the iframe/widget/single-file embed flows (cross-origin loading), serve the repo over HTTP, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/index.html`. A plain `file://` open works for the main game but not for the embed tests.
- Start the game via the「开始上课」button (or `Enter`/`Space`). Move with `WASD`/arrows, fire with `Space`/`J`. There is a countdown at the start of each level before enemies activate.

### Tests (Node, no deps)
There is no `npm test` script; run the test files directly:
- `node tests/maps.test.js`
- `node tests/entities.test.js`
- `node tests/embed.test.js`

The tests load `js/*.js` via Node's built-in `vm` module and assert on map/entity/embed invariants.

### Build (optional)
- `node scripts/build-standalone.js` regenerates the self-contained `school-tank.html` (inlines CSS + JS). This is only needed for the single-file distributable; normal play does not require a build.

### Lint
- No linter is configured (no ESLint/Prettier).
