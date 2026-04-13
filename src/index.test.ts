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
