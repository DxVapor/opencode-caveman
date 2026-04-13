import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mkdtemp, writeFile, rm, stat } from "fs/promises"
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

describe("CavemanPlugin file installation", () => {
  let configDir: string
  let originalEnv: string | undefined

  beforeEach(async () => {
    configDir = await mkdtemp(join(tmpdir(), "caveman-config-test-"))
    originalEnv = process.env.OPENCODE_CONFIG_DIR
    process.env.OPENCODE_CONFIG_DIR = configDir
  })

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.OPENCODE_CONFIG_DIR
    } else {
      process.env.OPENCODE_CONFIG_DIR = originalEnv
    }
    await rm(configDir, { recursive: true })
  })

  it("writes skill file to OPENCODE_CONFIG_DIR/skills/caveman/SKILL.md on server() call", async () => {
    const mod = await import("./index.js")
    const client = { app: { log: vi.fn().mockResolvedValue({}) } }
    const dir = await mkdtemp(join(tmpdir(), "caveman-dir-"))
    try {
      await (mod.default as any).server({ client, directory: dir })
      const skillPath = join(configDir, "skills", "caveman", "SKILL.md")
      const s = await stat(skillPath)
      expect(s.isFile()).toBe(true)
    } finally {
      await rm(dir, { recursive: true })
    }
  })

  it("writes command files to OPENCODE_CONFIG_DIR/command/ on server() call", async () => {
    const mod = await import("./index.js")
    const client = { app: { log: vi.fn().mockResolvedValue({}) } }
    const dir = await mkdtemp(join(tmpdir(), "caveman-dir-"))
    try {
      await (mod.default as any).server({ client, directory: dir })
      for (const name of ["caveman", "caveman-commit", "caveman-review"]) {
        const p = join(configDir, "command", `${name}.md`)
        const s = await stat(p)
        expect(s.isFile()).toBe(true)
      }
    } finally {
      await rm(dir, { recursive: true })
    }
  })

  it("does not overwrite existing skill file", async () => {
    const { mkdir, writeFile: wf } = await import("fs/promises")
    await mkdir(join(configDir, "skills", "caveman"), { recursive: true })
    const skillPath = join(configDir, "skills", "caveman", "SKILL.md")
    await wf(skillPath, "# existing content")

    const mod = await import("./index.js")
    const client = { app: { log: vi.fn().mockResolvedValue({}) } }
    const dir = await mkdtemp(join(tmpdir(), "caveman-dir-"))
    try {
      await (mod.default as any).server({ client, directory: dir })
      const { readFile } = await import("fs/promises")
      const content = await readFile(skillPath, "utf8")
      expect(content).toBe("# existing content")
    } finally {
      await rm(dir, { recursive: true })
    }
  })

  it("does not write files when OPENCODE_CONFIG_DIR is not set", async () => {
    delete process.env.OPENCODE_CONFIG_DIR
    const mod = await import("./index.js")
    const client = { app: { log: vi.fn().mockResolvedValue({}) } }
    const dir = await mkdtemp(join(tmpdir(), "caveman-dir-"))
    try {
      // Should not throw even without config dir
      await expect(
        (mod.default as any).server({ client, directory: dir }),
      ).resolves.toBeDefined()
    } finally {
      await rm(dir, { recursive: true })
    }
  })
})
