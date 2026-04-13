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
