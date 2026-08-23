# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single-service, client-only web app: a first-person Mars rover
simulator built with Vite 6 + TypeScript + Three.js. There is no backend,
database, or environment variables/secrets to configure.

- Node 22 (present on the VM) satisfies Vite 6's engine requirement. The update
  script runs `npm install` (a `package-lock.json` is committed).
- Standard commands live in `package.json` `scripts`:
  - Dev server: `npm run dev` (Vite on port `5173`, bound to `0.0.0.0` via
    `vite.config.ts` `server.host: true`).
  - Type-check + production build: `npm run build` (runs `tsc` then `vite build`).
  - Preview a production build: `npm run preview`.
- There is no separate lint step and no test suite. `tsc` (invoked by
  `npm run build`) is the type-check/static-analysis gate; `tsconfig.json`
  enables `strict`, `noUnusedLocals`, and `noUnusedParameters`.
- The app requires a WebGL-capable browser. Core interactions: WASD/arrow keys
  to drive, mouse-drag to look, the scan button (`#btn-scan`) to lock a nearby
  mineral target, and the collect button (`#btn-collect`, enabled only when the
  target is within 4.2 m) to store a sample in the six-slot sample bay.
