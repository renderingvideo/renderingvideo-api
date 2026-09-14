# RenderingVideo API Skill

Authenticated video, preview, file and credit workflows, including device-bound Agent Access and audit inspection. Requires Node.js 18+.

```bash
node scripts/rv-api.cjs --help
node scripts/rv-api.cjs capabilities --json
node scripts/rv-api.cjs preview examples/enhanced-schema.json --json
node scripts/rv-api.cjs tasks 'category=all&limit=20' --json
```

Supply one credential in your secure environment: `RENDERINGVIDEO_API_KEY` (`sk-...`, Settings → API Keys) or `RENDERINGVIDEO_AGENT_KEY` (`ak_...`, Admin → Agent Access). Agent mode exchanges a temporary token and signs every request. `context` and `capabilities` require `system:read`; `audit` requires `audit:read`, with `audit:read:all` for `allKeys=true`.

Agent identity is persisted to `~/.config/renderingvideo-agent/device.json`. Override its directory with the absolute `RENDERINGVIDEO_AGENT_STATE_DIR`. Reuse this private file across runs; the private key is never transmitted.

Optional settings: `RENDERINGVIDEO_API_ORIGIN` (app origin), `RENDERINGVIDEO_VIDEO_ORIGIN` (renderer origin), and `RENDERINGVIDEO_TIMEOUT_MS` (default 90000). `RENDERINGVIDEO_API_BASE_URL` is an app-origin alias for local MCP compatibility. Agent mode requires HTTPS except for localhost.

Creation options accept `title`, `category`, and `metadata`. Preview conversion/render options preserve `metadata`. `category=all` includes website tasks; default listing remains `api`. Render options use `webhook_url` and `num_workers`. Quality follows schema dimensions. Creating or converting a task does not start rendering.

New commands include `get-preview`, `delete-task`, `context`, `audit`, and `capabilities`. Append `--json` for machine-readable output. Mutating requests are not replayed automatically after failure.

See [SKILL.md](SKILL.md) for all commands, [API reference](https://renderingvideo.com/docs/api-reference.md), [Agent Access](https://renderingvideo.com/docs/agent-access.md), and [schema reference](https://renderingvideo.com/docs/json-spec.md). On older deployments where capabilities returns 404, consult the live docs.

## Development

`scripts/agent-auth.cjs` bundles the official Node SDK's `src/agent.ts` and error helpers without external runtime packages. Rebuild from the matching Node SDK checkout using `npx tsup src/agent.ts --format cjs --out-dir /tmp/rv-agent-auth`, then copy `agent.cjs` to `scripts/agent-auth.cjs`.

Run `node --test tests/*.test.cjs` for CLI behavior checks. Cross-language API/device-proof checks live in the website repository at `scripts/sdk-contract.test.ts`. Keep the website's `.claude/skills/renderingvideo-api` copy synchronized.
