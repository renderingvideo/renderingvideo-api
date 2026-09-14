---
name: renderingvideo-api
description: "Use RenderingVideo's authenticated video, preview, file, and credit API with a user API key or a device-bound agent key. Supports schema capability discovery, permanent renders, and agent context/audit inspection."
---

# RenderingVideo Authenticated API

Use this skill for authenticated RenderingVideo workflows. For public previews without credentials, use the public preview endpoint described in the live docs.

## Contract and schema discovery

- Read `https://renderingvideo.com/docs/api-reference.md` before authenticated calls. With Agent Access, also read `https://renderingvideo.com/docs/agent-access.md`.
- Run `capabilities` to inspect the deployed API's supported clips, animations, transitions and render qualities. Agent credentials need `system:read` for this call. If an older deployment returns 404, use its live docs; a missing capability endpoint does not imply the other endpoints are unavailable.
- Read `https://renderingvideo.com/docs/json-spec.md` before writing schema. Read `/docs/clips.md`, `/docs/elements.md` and the relevant element pages for the chosen clips, and `/docs/animation-and-timing.md` for animation work.
- `example.json` is a minimal schema; `examples/enhanced-schema.json` demonstrates grouped SVG assets, gradients, and animations without external media.

## Credentials

Use the user's supplied credential mode. Store credentials in environment variables, never in schema files or browser code.

- `RENDERINGVIDEO_API_KEY=sk-...`: ordinary user key from Settings → API Keys; sends `Authorization: Bearer sk-...`.
- `RENDERINGVIDEO_AGENT_KEY=ak_...`: key from Admin → Agent Access; the helper exchanges it for an `at_...` token and signs each request with a persistent Ed25519 device identity. Do not send `ak_` as a Bearer token or reuse a bare `at_` token without its proof.
- Set only one credential mode. Agent device identity is stored under `~/.config/renderingvideo-agent/device.json`, or the absolute directory in `RENDERINGVIDEO_AGENT_STATE_DIR`. Reuse this file across runs; it contains the private key and must remain private.
- Optional origins: `RENDERINGVIDEO_API_ORIGIN` (default `https://renderingvideo.com`) and `RENDERINGVIDEO_VIDEO_ORIGIN` (default `https://video.renderingvideo.com`). Agent calls require HTTPS except for localhost.

## Helper CLI

Run from the skill directory; append `--json` for machine-readable output:

```bash
node scripts/rv-api.cjs capabilities --json
node scripts/rv-api.cjs preview example.json --json
node scripts/rv-api.cjs create example.json create-options.json --json
node scripts/rv-api.cjs tasks 'category=all&limit=20' --json
```

| Command | API behavior |
| --- | --- |
| `capabilities` | GET `/api/v1/capabilities` |
| `preview <schema.json>` | POST `/api/v1/preview`, full schema body |
| `get-preview <tempId>` | GET `/api/v1/preview/:tempId` |
| `create <schema.json> [options.json]` | POST `/api/v1/video`, `{ config, metadata?, title?, category? }` |
| `task <taskId>`, `tasks [querystring]` | Read one task or a paginated list; default category is `api`, `category=all` includes website tasks |
| `render <taskId> [options.json]` | POST `/api/v1/video/:taskId/render` |
| `create-and-render <schema.json> [create-options.json] [render-options.json]` | Create once, then render the returned task |
| `convert-preview <tempId> [options.json]` | Convert into a permanent task, preserving `category` and `metadata` |
| `render-preview <tempId> [options.json]` | Convert and render; accepts conversion and render options |
| `credits` | GET `/api/v1/credits` |
| `upload <file> [more-files...]`, `files [querystring]` | Upload assets or list hosted files |
| `delete-task <taskId>`, `delete-file <fileId>`, `delete-preview <tempId>` | Delete the specified resource when requested |
| `context`, `audit [querystring]` | Agent-only context and audit endpoints |

Render options use REST field names `webhook_url` and `num_workers` (positive integer). Render quality follows the schema dimensions; do not invent a `quality` request option. Task creation and preview conversion do not start rendering. Starting a render may consume credits.

## Agent scopes and failures

- `context` and `capabilities`: `system:read`. Credits: `credits:read`.
- Task reads/writes: `videos:read` / `videos:write`; file reads/writes: `files:read` / `files:write`; preview reads/writes: `previews:read` / `previews:write`.
- `audit` defaults to this key's events (`audit:read`); `allKeys=true` requires the separate `audit:read:all` scope. An audit query is a snapshot, not continuous monitoring.
- Tokens refresh before expiration. Blocked devices, revoked keys, signature failures, or insufficient scopes require correcting access; do not loop or switch identities to bypass them.
- The CLI times out after 90 seconds by default (`RENDERINGVIDEO_TIMEOUT_MS`). If a mutating call times out or fails ambiguously, inspect the known task before retrying; do not blindly create or charge for another render.

## Workflow and results

Upload required assets, build schema from supported fields, and preview it. Create a permanent task or render only when the user's request calls for that output. A temporary preview validates schema acceptance but does not establish successful final rendering or visual quality.

Preserve returned identifiers and URLs: `tempId`, `taskId`, `videoTaskId`, `renderTaskId`, `viewerUrl`, `previewUrl`, `playerUrl`, `configUrl`, `videoUrl`, and `expiresIn` when present. Prefer `viewerUrl` for a shareable preview; resolve relative URLs against the video service origin. Report a finished video only after the task says `completed` and provides its video URL. Keep validation errors, HTTP status and API error codes visible.
