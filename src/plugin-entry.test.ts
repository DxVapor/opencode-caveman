import { describe, it, expect } from "vitest"
import { existsSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PKG_ROOT = join(__dirname, "..")
const ENTRY_PATH = join(PKG_ROOT, ".opencode", "plugins", "opencode-caveman.js")

describe(".opencode/plugins/opencode-caveman.js", () => {
  it("file exists at expected OpenCode discovery path", () => {
    expect(existsSync(ENTRY_PATH)).toBe(true)
  })

  it("re-exports a plugin with id and server", async () => {
    const url = `file://${ENTRY_PATH}`
    const mod = await import(url)
    expect(typeof mod.default).toBe("object")
    expect(mod.default.id).toBe("opencode-caveman")
    expect(typeof mod.default.server).toBe("function")
  })
})
