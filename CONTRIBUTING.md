# Contributing

## Setup

```bash
git clone https://github.com/DxVapor/opencode-caveman
cd opencode-caveman
npm install
```

## Development

- **Tests first.** No code without a failing test (TDD).
- **YAGNI.** Don't add things that aren't needed yet.
- **Terse commits.** Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

```bash
npm test          # run tests
npm run build     # compile TypeScript
```

## Submitting changes

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Write tests, then code
4. Ensure `npm test` passes and `npm run build` is clean
5. Open a PR against `main`

## Plugin API

Check `@opencode-ai/plugin` TypeScript types before guessing at plugin API shapes. See `src/index.ts` for the existing pattern.

## Compression rules

The caveman compression text lives in `src/compress.ts` (`CAVEMAN_HEADER`). Changes there should update `skills/caveman/SKILL.md` to match.
