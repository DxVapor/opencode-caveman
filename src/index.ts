import { tool } from "@opencode-ai/plugin"
import { buildCavemanRules } from "./compress.js"
import { readdir, readFile } from "fs/promises"
import { join, basename, extname } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PKG_ROOT = join(__dirname, "..")

const INJECTED_MARKER = "Respond terse like smart caveman"

async function loadCommandsFromDir(
  dir: string,
): Promise<Record<string, { template: string; description?: string }>> {
  const result: Record<string, { template: string; description?: string }> = {}
  try {
    const files = await readdir(dir)
    for (const file of files) {
      if (extname(file) !== ".md") continue
      const name = basename(file, ".md")
      const content = await readFile(join(dir, file), "utf8")
      result[name] = { template: content.trim() }
    }
  } catch {
    // commands dir missing or unreadable — skip
  }
  return result
}

const CavemanPlugin = async ({ client, directory }: any) => {
  return {
    config: async (config: any) => {
      // Register skills directory
      config.skills = config.skills ?? {}
      config.skills.paths = config.skills.paths ?? []
      const skillsDir = join(PKG_ROOT, "skills")
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir)
      }

      // Register commands
      const commands = await loadCommandsFromDir(join(PKG_ROOT, "commands"))
      config.command = config.command ?? {}
      for (const [name, cmd] of Object.entries(commands)) {
        if (!config.command[name]) {
          config.command[name] = cmd
        }
      }
    },

    "experimental.chat.messages.transform": async (_input: any, output: any) => {
      try {
        if (!output.messages?.length) return
        const firstUser = output.messages.find((m: any) => m.info?.role === "user")
        if (!firstUser?.parts?.length) return
        // Only inject once
        if (
          firstUser.parts.some(
            (p: any) => p.type === "text" && p.text?.includes(INJECTED_MARKER),
          )
        )
          return
        const rules = await buildCavemanRules(directory)
        const ref = firstUser.parts[0]
        firstUser.parts.unshift({ ...ref, type: "text", text: rules })
      } catch (err) {
        try {
          await client.app.log({
            body: {
              service: "opencode-caveman",
              level: "error",
              message: String(err),
            },
          })
        } catch {}
      }
    },

    tool: {
      "caveman-compress": tool({
        description:
          "Returns caveman compression rules prepended to your AGENTS.md. Inject the output as session instructions to activate terse mode.",
        args: {},
        async execute(_args: any, _context: any) {
          return buildCavemanRules(directory)
        },
      }),
    },
  }
}

export default {
  id: "opencode-caveman",
  server: CavemanPlugin,
}
