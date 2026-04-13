# opencode-caveman Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an OpenCode plugin that auto-injects caveman token-compression rules into every session, with slash commands and a skill for on-demand use.

**Architecture:** npm package exposing an OpenCode plugin (`src/index.ts`) that registers a `caveman-compress` custom tool and a `session.created` hook. The hook injects caveman instructions into the new session via `client.session.prompt` with `noReply: true`. A pure `buildCavemanRules` helper in `src/compress.ts` handles file I/O and string assembly, keeping the plugin entry point thin and testable.

**Tech Stack:** TypeScript, `@opencode-ai/plugin`, Vitest, Bun (runtime used by OpenCode)

---

## File Map

| Path | Purpose |
|------|---------|
| `src/compress.ts` | Pure function: reads AGENTS.md / CLAUDE.md, prepends caveman header |
| `src/compress.test.ts` | Unit tests for compress |
| `src/index.ts` | Plugin entry: registers tool + `session.created` hook |
| `src/index.test.ts` | Unit tests for plugin hook and tool |
| `skills/caveman/SKILL.md` | Caveman skill (upstream content + OpenCode frontmatter) |
| `commands/caveman.md` | `/caveman [lite\|full\|ultra\|wenyan]` command |
| `commands/caveman-commit.md` | `/caveman-commit` command |
| `commands/caveman-review.md` | `/caveman-review` command |
| `package.json` | Package config with `main`, `types`, `files` |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Test runner config |
| `AGENTS.md` | Repo's own rules (caveman-compressed) |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "opencode-caveman",
  "version": "0.1.0",
  "description": "Caveman token-compression plugin for OpenCode",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "skills", "commands"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "@opencode-ai/plugin": "*"
  },
  "devDependencies": {
    "@opencode-ai/plugin": "latest",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  },
  "keywords": ["opencode", "plugin", "caveman", "token-compression"],
  "license": "MIT"
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
  },
})
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `@opencode-ai/plugin` installed.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts
git commit -m "feat: project scaffold"
```

---

## Task 2: `buildCavemanRules` — core compression function (TDD)

**Files:**
- Create: `src/compress.ts`
- Create: `src/compress.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/compress.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, writeFile, rm } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { buildCavemanRules, CAVEMAN_HEADER } from "./compress.js"

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "caveman-test-"))
})

afterEach(async () => {
  await rm(dir, { recursive: true })
})

describe("buildCavemanRules", () => {
  it("prepends CAVEMAN_HEADER to AGENTS.md content", async () => {
    await writeFile(join(dir, "AGENTS.md"), "# My Rules\n\nBe helpful.")
    const result = await buildCavemanRules(dir)
    expect(result).toContain(CAVEMAN_HEADER)
    expect(result).toContain("# My Rules")
    const headerIndex = result.indexOf(CAVEMAN_HEADER)
    const rulesIndex = result.indexOf("# My Rules")
    expect(headerIndex).toBeLessThan(rulesIndex)
  })

  it("falls back to CLAUDE.md when AGENTS.md is absent", async () => {
    await writeFile(join(dir, "CLAUDE.md"), "# Claude Rules")
    const result = await buildCavemanRules(dir)
    expect(result).toContain(CAVEMAN_HEADER)
    expect(result).toContain("# Claude Rules")
  })

  it("prefers AGENTS.md over CLAUDE.md when both exist", async () => {
    await writeFile(join(dir, "AGENTS.md"), "# Agents Rules")
    await writeFile(join(dir, "CLAUDE.md"), "# Claude Rules")
    const result = await buildCavemanRules(dir)
    expect(result).toContain("# Agents Rules")
    expect(result).not.toContain("# Claude Rules")
  })

  it("returns header-only string when no rules file exists", async () => {
    const result = await buildCavemanRules(dir)
    expect(result).toBe(CAVEMAN_HEADER)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/compress.test.ts
```

Expected: FAIL — `Cannot find module './compress.js'`

- [ ] **Step 3: Write `src/compress.ts`**

```ts
import { readFile } from "fs/promises"
import { join } from "path"

export const CAVEMAN_HEADER = `Respond terse like smart caveman. All technical substance stay. Only fluff die.

## Persistence

ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".

Default: **full**. Switch: \`/caveman lite|full|ultra\`.

## Rules

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.

Pattern: \`[thing] [action] [reason]. [next step].\`

Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check use \`<\` not \`<=\`. Fix:"

## Intensity

| Level | What changes |
|-------|-------------|
| **lite** | No filler/hedging. Keep articles + full sentences. Professional but tight |
| **full** | Drop articles, fragments OK, short synonyms. Classic caveman |
| **ultra** | Abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y), one word when one word enough |
| **wenyan-lite** | Semi-classical. Drop filler/hedging but keep grammar structure, classical register |
| **wenyan-full** | Maximum classical terseness. Fully 文言文. 80-90% character reduction |
| **wenyan-ultra** | Extreme abbreviation while keeping classical Chinese feel. Maximum compression |

## Auto-Clarity

Drop caveman for: security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread, user asks to clarify or repeats question. Resume caveman after clear part done.

## Boundaries

Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persist until changed or session end.`.trim()

export async function buildCavemanRules(directory: string): Promise<string> {
  let existing = ""
  for (const filename of ["AGENTS.md", "CLAUDE.md"]) {
    try {
      existing = await readFile(join(directory, filename), "utf-8")
      break
    } catch {
      // not found, try next
    }
  }
  if (!existing) return CAVEMAN_HEADER
  return `${CAVEMAN_HEADER}\n\n---\n\n${existing}`.trimEnd()
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/compress.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/compress.ts src/compress.test.ts
git commit -m "feat: add buildCavemanRules core function"
```

---

## Task 3: Plugin entry point (TDD)

**Files:**
- Create: `src/index.ts`
- Create: `src/index.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/index.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mkdtemp, writeFile, rm } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "caveman-plugin-test-"))
})

afterEach(async () => {
  await rm(dir, { recursive: true })
})

describe("CavemanPlugin", () => {
  it("exports a default plugin function", async () => {
    const mod = await import("./index.js")
    expect(typeof mod.default).toBe("function")
  })

  it("session.created hook calls client.session.prompt with noReply:true", async () => {
    await writeFile(join(dir, "AGENTS.md"), "# Test Rules")

    const mockPrompt = vi.fn().mockResolvedValue({})
    const mockLog = vi.fn().mockResolvedValue({})
    const client = {
      session: { prompt: mockPrompt },
      app: { log: mockLog },
    }

    const mod = await import("./index.js")
    const hooks = await mod.default({ client, directory: dir } as any)

    // Simulate session.created event — event payload carries session id
    const handler = (hooks as any)["session.created"]
    expect(typeof handler).toBe("function")

    await handler({ id: "test-session-123" })

    expect(mockPrompt).toHaveBeenCalledOnce()
    const call = mockPrompt.mock.calls[0][0]
    expect(call.path.id).toBe("test-session-123")
    expect(call.body.noReply).toBe(true)
    expect(call.body.parts[0].type).toBe("text")
    expect(call.body.parts[0].text).toContain("Respond terse like smart caveman")
    expect(call.body.parts[0].text).toContain("# Test Rules")
  })

  it("session.created hook logs error and does not throw on failure", async () => {
    const mockPrompt = vi.fn().mockRejectedValue(new Error("network error"))
    const mockLog = vi.fn().mockResolvedValue({})
    const client = {
      session: { prompt: mockPrompt },
      app: { log: mockLog },
    }

    const mod = await import("./index.js")
    const hooks = await mod.default({ client, directory: dir } as any)
    const handler = (hooks as any)["session.created"]

    // Should not throw
    await expect(handler({ id: "test-session-123" })).resolves.toBeUndefined()
    expect(mockLog).toHaveBeenCalledOnce()
    const logCall = mockLog.mock.calls[0][0]
    expect(logCall.body.level).toBe("error")
  })

  it("registers caveman-compress tool", async () => {
    const client = {
      session: { prompt: vi.fn() },
      app: { log: vi.fn() },
    }

    const mod = await import("./index.js")
    const hooks = await mod.default({ client, directory: dir } as any)

    expect((hooks as any).tool).toBeDefined()
    expect(typeof (hooks as any).tool["caveman-compress"]).toBe("object")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/index.test.ts
```

Expected: FAIL — `Cannot find module './index.js'`

- [ ] **Step 3: Write `src/index.ts`**

```ts
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { buildCavemanRules } from "./compress.js"

const CavemanPlugin: Plugin = async ({ client, directory }) => {
  return {
    "session.created": async (event: any) => {
      try {
        const sessionId: string | undefined = event?.id ?? event?.sessionID ?? event?.session?.id
        if (!sessionId) return
        const rules = await buildCavemanRules(directory)
        await client.session.prompt({
          path: { id: sessionId },
          body: {
            noReply: true,
            parts: [{ type: "text", text: rules }],
          },
        })
      } catch (err) {
        await client.app.log({
          body: {
            service: "opencode-caveman",
            level: "error",
            message: String(err),
          },
        })
      }
    },
    tool: {
      "caveman-compress": tool({
        description:
          "Returns caveman compression rules prepended to your AGENTS.md. Inject the output as session instructions to activate terse mode.",
        args: {},
        async execute(_args, context) {
          return buildCavemanRules(context.directory)
        },
      }),
    },
  }
}

export default CavemanPlugin
```

> **Note:** The `session.created` event payload shape is not explicitly documented. The implementation checks `event.id`, `event.sessionID`, and `event.session.id` to handle variations. After installing and testing locally, verify the actual shape by checking TypeScript types from `@opencode-ai/plugin` or inspecting a live event with `client.app.log`.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/index.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: PASS — all 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/index.test.ts
git commit -m "feat: add plugin entry point with session.created hook and caveman-compress tool"
```

---

## Task 4: Build verification

**Files:**
- No new files — verify TypeScript compiles cleanly.

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: `dist/` directory created with `index.js`, `index.d.ts`, `compress.js`, `compress.d.ts`. No TypeScript errors.

- [ ] **Step 2: If build fails, fix type errors**

Common issues and fixes:
- `tool` import not found: check that `@opencode-ai/plugin` exports `tool`. If not, check the actual export name with `node -e "console.log(Object.keys(require('@opencode-ai/plugin')))"`.
- `Plugin` type mismatch on hook return: cast return type as `any` for now and open an issue upstream.
- `args: {}` not valid for `tool`: if empty args aren't supported, add a dummy arg or check the `tool` helper's type definition.

- [ ] **Step 3: Commit dist if build passes**

```bash
git add dist/
git commit -m "build: compile TypeScript to dist"
```

---

## Task 5: Skill file

**Files:**
- Create: `skills/caveman/SKILL.md`

- [ ] **Step 1: Create directory and write skill**

```bash
mkdir -p skills/caveman
```

Create `skills/caveman/SKILL.md` with this exact content:

```markdown
---
name: caveman
description: >
  Ultra-compressed communication mode. Cuts token usage ~75% by speaking like caveman
  while keeping full technical accuracy. Supports intensity levels: lite, full (default), ultra,
  wenyan-lite, wenyan-full, wenyan-ultra.
  Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens",
  "be brief", or invokes /caveman. Also auto-triggers when token efficiency is requested.
compatibility: opencode
---

Respond terse like smart caveman. All technical substance stay. Only fluff die.

## Persistence

ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".

Default: **full**. Switch: `/caveman lite|full|ultra`.

## Rules

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"

## Intensity

| Level | What changes |
|-------|-------------|
| **lite** | No filler/hedging. Keep articles + full sentences. Professional but tight |
| **full** | Drop articles, fragments OK, short synonyms. Classic caveman |
| **ultra** | Abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y), one word when one word enough |
| **wenyan-lite** | Semi-classical. Drop filler/hedging but keep grammar structure, classical register |
| **wenyan-full** | Maximum classical terseness. Fully 文言文. 80-90% character reduction. Classical sentence patterns, verbs precede objects, subjects often omitted, classical particles (之/乃/為/其) |
| **wenyan-ultra** | Extreme abbreviation while keeping classical Chinese feel. Maximum compression, ultra terse |

Example — "Why React component re-render?"
- lite: "Your component re-renders because you create a new object reference each render. Wrap it in `useMemo`."
- full: "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."
- ultra: "Inline obj prop → new ref → re-render. `useMemo`."
- wenyan-lite: "組件頻重繪，以每繪新生對象參照故。以 useMemo 包之。"
- wenyan-full: "物出新參照，致重繪。`useMemo` wrap。"
- wenyan-ultra: "新參照→重繪。`useMemo`。"

Example — "Explain database connection pooling."
- lite: "Connection pooling reuses open connections instead of creating new ones per request. Avoids repeated handshake overhead."
- full: "Pool reuse open DB connections. No new connection per request. Skip handshake overhead."
- ultra: "Pool = reuse DB conn. Skip handshake → fast under load."

## Auto-Clarity

Drop caveman for: security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread, user asks to clarify or repeats question. Resume caveman after clear part done.

Example — destructive op:
> **Warning:** This will permanently delete all rows in the `users` table and cannot be undone.
> ```sql
> DROP TABLE users;
> ```
> Caveman resume. Verify backup exist first.

## Boundaries

Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persist until changed or session end.
```

- [ ] **Step 2: Commit**

```bash
git add skills/
git commit -m "feat: add caveman skill with OpenCode frontmatter"
```

---

## Task 6: Slash commands

**Files:**
- Create: `commands/caveman.md`
- Create: `commands/caveman-commit.md`
- Create: `commands/caveman-review.md`

- [ ] **Step 1: Write `commands/caveman.md`**

```markdown
Set caveman compression level for this session.

Usage: /caveman [lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra]

Activate the caveman skill at the specified intensity level (default: full if no level given).
Respond confirming the active level in one terse sentence. Then apply that level from the next
response onward. If the user types just `/caveman` with no argument, activate full mode.
```

- [ ] **Step 2: Write `commands/caveman-commit.md`**

```markdown
Generate a terse git commit message for staged changes.

Run: git diff --cached

Summarize changes as a conventional commit message (type: description). One line, no body,
no bullet points. type must be one of: feat, fix, refactor, chore, docs, test, build, ci.
Output only the commit message — no explanation, no "here is your commit message", no quotes.
```

- [ ] **Step 3: Write `commands/caveman-review.md`**

```markdown
Review the current diff or specified file for code quality issues.

Run: git diff HEAD

Output findings as a flat list. Each item: [file:line] [issue]. No preamble, no summary,
no score. Severity prefix: CRIT / WARN / NIT. Stop after listing. Do not suggest rewrites
unless CRIT. If no issues found, output: "clean".
```

- [ ] **Step 4: Commit**

```bash
git add commands/
git commit -m "feat: add caveman slash commands"
```

---

## Task 7: AGENTS.md and README

**Files:**
- Create: `AGENTS.md`
- Create: `README.md`

- [ ] **Step 1: Write `AGENTS.md`**

```markdown
# opencode-caveman

TDD. Frequent commits. No code without test. YAGNI.

Terse. No filler. Fragments OK. Code blocks unchanged.

On plugin API uncertainty: check `@opencode-ai/plugin` TypeScript types before guessing.
```

- [ ] **Step 2: Write `README.md`**

```markdown
# opencode-caveman

OpenCode plugin that activates [caveman](https://github.com/JuliusBrussee/caveman) token-compression automatically on every session. Terse responses. Full technical accuracy.

## Install

```
opencode plugin opencode-caveman        # project-level
opencode plugin -g opencode-caveman     # global
```

Caveman is active from the next session. No config required.

## Commands

| Command | Description |
|---------|-------------|
| `/caveman [lite\|full\|ultra\|wenyan]` | Set compression level |
| `/caveman-commit` | Terse commit message for staged changes |
| `/caveman-review` | Terse code review of current diff |

## Skill

Load caveman instructions on demand:

```
use skill caveman
```

## Levels

| Level | Style |
|-------|-------|
| lite | No filler, full sentences |
| **full** (default) | Fragments, no articles |
| ultra | Abbreviations, arrows for causality |
| wenyan-full | Classical Chinese (文言文) |

## Uninstall

Remove `opencode-caveman` from your `opencode.json` plugin list, then:

```
npm uninstall opencode-caveman
```

## Credits

Compression rules from [juliusbrussee/caveman](https://github.com/JuliusBrussee/caveman).
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: add AGENTS.md and README"
```

---

## Task 8: Local smoke test

- [ ] **Step 1: Run full test suite one final time**

```bash
npm test
```

Expected: PASS — all 8 tests pass.

- [ ] **Step 2: Install locally into a scratch project**

```bash
mkdir /tmp/caveman-smoke && cd /tmp/caveman-smoke
opencode plugin /Users/louis/Projects/opencode-caveman
```

Expected: `opencode.json` created/updated with plugin entry pointing to local path.

- [ ] **Step 3: Start OpenCode session and verify terse output**

Start OpenCode in `/tmp/caveman-smoke`. Send any message. Confirm responses are terse (no "Sure!", no "I'd be happy to", fragments used).

- [ ] **Step 4: Verify `/caveman-commit` works**

In the scratch project, stage a dummy file and run `/caveman-commit`. Confirm output is a single conventional commit line with no preamble.

- [ ] **Step 5: Verify no interference with other plugins**

If supermemory is installed globally, confirm it still responds normally in the same session.

- [ ] **Step 6: Investigate event payload if hook did not fire**

If caveman did not activate automatically on session start, the `session.created` event payload shape needs investigation. Add a log statement to the hook:

```ts
"session.created": async (event: any) => {
  await client.app.log({
    body: { service: "opencode-caveman", level: "info", message: JSON.stringify(event) }
  })
  // ... rest of handler
```

Check OpenCode logs to see the actual event shape. Update the session ID extraction line in `src/index.ts` accordingly, re-run tests, rebuild.

- [ ] **Step 7: Commit any fixes from smoke test**

```bash
git add -A
git commit -m "fix: correct session.created event payload extraction" # if needed
```

---

## Task 9: Publish to npm

- [ ] **Step 1: Verify `package.json` `files` field is complete**

Confirm `files` includes `["dist", "skills", "commands"]` — the source `src/` is excluded (compiled output in `dist/` is what consumers get).

- [ ] **Step 2: Dry run**

```bash
npm pack --dry-run
```

Expected: lists `dist/`, `skills/`, `commands/`, `package.json`, `README.md`. Does NOT include `src/` or `node_modules/`.

- [ ] **Step 3: Publish**

```bash
npm publish --access public
```

Expected: package published to npm as `opencode-caveman`.

- [ ] **Step 4: Verify install from npm works**

```bash
mkdir /tmp/caveman-npm-test && cd /tmp/caveman-npm-test
opencode plugin opencode-caveman
```

Expected: installs from npm, `opencode.json` updated.

- [ ] **Step 5: Final commit**

```bash
git tag v0.1.0
git commit -m "chore: publish v0.1.0" --allow-empty
```
