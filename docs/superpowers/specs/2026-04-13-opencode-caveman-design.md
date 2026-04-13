# opencode-caveman Design Spec

**Date:** 2026-04-13  
**Status:** Approved

---

## Overview

`opencode-caveman` is an OpenCode-native port of [juliusbrussee/caveman](https://github.com/JuliusBrussee/caveman) — a token-compression skill that makes AI responses maximally terse. It ships as an npm package installable via `opencode plugin` and activates automatically on session start.

---

## Architecture

Three layers, each independently useful:

1. **Plugin** (`src/index.ts`) — registers a `caveman-compress` tool and hooks `session.created` to auto-inject caveman instructions into every session
2. **Skill** (`skills/caveman/SKILL.md`) — the caveman compression instructions, loadable on demand via the skill system
3. **Commands** (`commands/`) — slash commands for user-triggered caveman modes

The plugin is the glue. The skill and commands work without it, but the plugin makes caveman always-on without user intervention.

Distribution: npm package. Install with:

```
opencode plugin opencode-caveman        # project-level
opencode plugin -g opencode-caveman     # global
```

This installs the package and edits `opencode.json` automatically.

---

## Components & Data Flow

### `src/index.ts` — Plugin entry point

Exports a default plugin object conforming to `@opencode-ai/plugin` interface.

**Registers:**
- `caveman-compress` custom tool
- `session.created` event hook

**`caveman-compress` tool:**
- Reads `AGENTS.md` (falling back to `CLAUDE.md`, then empty string if neither exists)
- Prepends caveman compression instructions to the content
- Returns the combined string for the agent to use as its rules

**`session.created` hook:**
- Calls `caveman-compress` internally
- Injects the result into session context so caveman is active from message one

**Interface:**
```ts
// Tool input: none required
// Tool output: string (compressed AGENTS.md content with caveman header)
```

### `skills/caveman/SKILL.md`

Upstream caveman `SKILL.md` content, verbatim, with OpenCode-compatible frontmatter added:

```yaml
---
name: caveman
description: Token-compression skill. Makes AI responses maximally terse.
compatibility: opencode
---
```

Used when the agent needs to explicitly load caveman mid-session, or when users invoke it via the skill system.

### `commands/`

Three slash commands, adapted from upstream caveman:

| File | Command | Purpose |
|------|---------|---------|
| `caveman.md` | `/caveman [lite\|full\|ultra\|wenyan]` | Set compression level for current session |
| `caveman-commit.md` | `/caveman-commit` | Generate a terse commit message |
| `caveman-review.md` | `/caveman-review` | Terse code review |

Command files are markdown with a system prompt. OpenCode loads them from `commands/` in the plugin package.

### Install UX

```
opencode plugin opencode-caveman        # project-level
opencode plugin -g opencode-caveman     # global
```

The `opencode plugin` CLI handles package installation and `opencode.json` registration in one step. No post-install manual config required. Caveman is active from the next session.

---

## Error Handling

Three failure surfaces, all handled with the same policy: **log and proceed silently**. Caveman is an enhancement, not load-bearing infrastructure.

| Surface | Failure scenario | Behavior |
|---------|-----------------|----------|
| `caveman-compress` tool | File read error, malformed AGENTS.md | Log error, return empty string — session continues without caveman |
| `session.created` hook | Any exception during hook execution | Log error, swallow — session starts normally |
| Missing skill/command file | Partial install, corrupted package | OpenCode surfaces "not found" naturally — no special handling in plugin |

No retry logic. No user-visible error dialogs.

---

## Testing

### Unit tests (Vitest)

- `caveman-compress`: given a mock `AGENTS.md`, assert output contains caveman header prepended to original content
- `caveman-compress`: given no `AGENTS.md` or `CLAUDE.md`, assert output is caveman header only (no crash)
- Plugin hook: assert `session.created` triggers compress and injects result into context

Run with: `npm test`

### Integration smoke test (manual, documented in README)

1. Install plugin locally: `opencode plugin ./` in a scratch project
2. Start a session — confirm terse output from message one
3. Run `/caveman full` — confirm mode switch
4. If supermemory is also installed, confirm it still functions normally in the same session

### CI

None required for v1. Local `npm test` is sufficient.

---

## Repo Structure

```
opencode-caveman/
├── src/
│   └── index.ts                    # Plugin entry: session.created hook + caveman-compress tool
├── skills/
│   └── caveman/
│       └── SKILL.md                # Reused from upstream, OpenCode frontmatter added
├── commands/
│   ├── caveman.md                  # /caveman [lite|full|ultra|wenyan]
│   ├── caveman-commit.md           # /caveman-commit
│   └── caveman-review.md           # /caveman-review
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-13-opencode-caveman-design.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── AGENTS.md                       # Repo's own rules file (caveman-compressed)
```

---

## Constraints & Non-Goals

- **No model routing** — caveman only, no workflow toolkit
- **No shared state with other plugins** — separate plugin files, zero conflict risk with supermemory or others
- **No `opencode plugin remove` subcommand** — manual uninstall: remove entry from `opencode.json` and run `npm uninstall opencode-caveman`
- **AGENTS.md takes precedence over CLAUDE.md** — caveman-compress checks `AGENTS.md` first
- **Always-on by default** — no opt-in flag; installing the plugin activates caveman automatically
