import { tool } from "@opencode-ai/plugin"
import { buildCavemanRules } from "./compress.js"

const CavemanPlugin = async ({ client, directory }: any) => {
  return {
    "session.created": async (event: any) => {
      try {
        const sessionId: string | undefined =
          event?.id ?? event?.sessionID ?? event?.session?.id
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
        async execute(_args: any, _context: any) {
          return buildCavemanRules(directory)
        },
      }),
    },
  }
}

export default CavemanPlugin
