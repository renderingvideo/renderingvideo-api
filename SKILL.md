---
name: renderingvideo-api
description: "Use RenderingVideo's authenticated video, preview, file, and credit API with the user’s API key. Supports schema capability discovery and permanent renders for resources owned by that user."
---

# RenderingVideo Authenticated API

Use this skill for authenticated RenderingVideo workflows. For public previews without credentials, use the public preview endpoint described in the live docs.

## Contract and schema discovery

- Read `https://renderingvideo.com/docs/api-reference.md` before authenticated calls.
- Run `capabilities` to inspect the deployed API's supported clips, animations, transitions and render qualities. If an older deployment returns 404, use its live docs; a missing capability endpoint does not imply the other endpoints are unavailable.
- Read `https://renderingvideo.com/docs/json-spec.md` before writing schema. Read `/docs/clips.md`, `/docs/elements.md` and the relevant element pages for the chosen clips, and `/docs/animation-and-timing.md` for animation work.
- `example.json` is a minimal schema; `examples/enhanced-schema.json` demonstrates grouped SVG assets, gradients, and animations without external media.

## Credentials

Use `RENDERINGVIDEO_API_KEY=sk-...` from the user's Settings → API Keys. The helper sends `Authorization: Bearer sk-...` and accesses that user's resources. Store the key in an environment variable, never in schema files or browser code.

This public skill does not use administrator Agent Access, device enrollment, temporary administrator tokens, context, or audit endpoints. Do not ask a user for an administrator key to perform a video task.

Optional origins: `RENDERINGVIDEO_API_ORIGIN` (default `https://renderingvideo.com`) and `RENDERINGVIDEO_VIDEO_ORIGIN` (default `https://video.renderingvideo.com`).

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

Render options use REST field names `webhook_url` and `num_workers` (positive integer). Render quality follows the schema dimensions; do not invent a `quality` request option. Task creation and preview conversion do not start rendering. Starting a render may consume credits.

## Failures

- Invalid or revoked API keys require the user to supply a valid key for their own account. Do not switch to administrator credentials.
- The CLI times out after 90 seconds by default (`RENDERINGVIDEO_TIMEOUT_MS`). If a mutating call times out or fails ambiguously, inspect the known task before retrying; do not blindly create or charge for another render.

## Workflow and results

Upload required assets, build schema from supported fields, and preview it. Create a permanent task or render only when the user's request calls for that output. A temporary preview validates schema acceptance but does not establish successful final rendering or visual quality.

Preserve returned identifiers and URLs: `tempId`, `taskId`, `videoTaskId`, `renderTaskId`, `viewerUrl`, `previewUrl`, `playerUrl`, `configUrl`, `videoUrl`, and `expiresIn` when present. Prefer `viewerUrl` for a shareable preview; resolve relative URLs against the video service origin. Report a finished video only after the task says `completed` and provides its video URL. Keep validation errors, HTTP status and API error codes visible.
