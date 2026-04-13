import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
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

describe("CavemanPlugin module", () => {
  it("default export is V1 plugin object with id and server", async () => {
    const mod = await import("./index.js")
    expect(typeof mod.default).toBe("object")
    expect(mod.default.id).toBe("opencode-caveman")
    expect(typeof (mod.default as any).server).toBe("function")
  })

  describe("hooks", () => {
    let hooks: any
    let mockLog: any
    let client: any

    beforeEach(async () => {
      mockLog = vi.fn().mockResolvedValue({})
      client = {
        session: { prompt: vi.fn() },
        app: { log: mockLog },
      }
      const mod = await import("./index.js")
      hooks = await (mod.default as any).server({ client, directory: dir })
    })

    it("registers caveman-compress tool", () => {
      expect(hooks.tool).toBeDefined()
      expect(typeof hooks.tool["caveman-compress"]).toBe("object")
    })

    it("config hook registers skills directory path", async () => {
      expect(typeof hooks.config).toBe("function")
      const config: any = {}
      await hooks.config(config)
      expect(Array.isArray(config.skills?.paths)).toBe(true)
      expect(config.skills.paths.length).toBeGreaterThan(0)
      expect(config.skills.paths[0]).toContain("skills")
    })

    it("config hook registers commands from commands/ directory", async () => {
      const config: any = {}
      await hooks.config(config)
      expect(config.command).toBeDefined()
      expect(typeof config.command["caveman"]).toBe("object")
      expect(typeof config.command["caveman"].template).toBe("string")
      expect(config.command["caveman-commit"]).toBeDefined()
      expect(config.command["caveman-review"]).toBeDefined()
    })

    it("config hook does not overwrite existing skills paths", async () => {
      const config: any = { skills: { paths: ["/existing/path"] } }
      await hooks.config(config)
      expect(config.skills.paths).toContain("/existing/path")
      expect(config.skills.paths.length).toBeGreaterThan(1)
    })

    it("chat.messages.transform injects caveman rules into first user message", async () => {
      await writeFile(join(dir, "AGENTS.md"), "# Test Rules")
      const output = {
        messages: [
          { info: { role: "user" }, parts: [{ type: "text", text: "Hello" }] },
        ],
      }
      await hooks["experimental.chat.messages.transform"]({}, output)
      expect(output.messages[0].parts.length).toBe(2)
      expect(output.messages[0].parts[0].text).toContain("Respond terse like smart caveman")
      expect(output.messages[0].parts[0].text).toContain("# Test Rules")
    })

    it("chat.messages.transform does not inject twice", async () => {
      const output = {
        messages: [
          {
            info: { role: "user" },
            parts: [
              { type: "text", text: "Respond terse like smart caveman\nalready injected" },
              { type: "text", text: "Hello" },
            ],
          },
        ],
      }
      await hooks["experimental.chat.messages.transform"]({}, output)
      expect(output.messages[0].parts.length).toBe(2) // unchanged
    })

    it("chat.messages.transform does not throw on bad output", async () => {
      await expect(
        hooks["experimental.chat.messages.transform"]({}, { messages: null }),
      ).resolves.toBeUndefined()
    })
  })
})
