---
name: renderingvideo-api
description: "Authenticated RenderingVideo REST API assistant that uses Authorization: Bearer sk-... with the /api/v1/* endpoints. Use this when Codex needs to work with a RenderingVideo API key to create preview links, create or render permanent video tasks, inspect credits, convert previews, or manage uploaded files."
---

# RenderingVideo Authenticated API Assistant

Use this skill when the task requires RenderingVideo API-key access through `/api/v1/*`.

## Read This First

- Read `https://renderingvideo.com/docs/api-reference.md` before calling authenticated endpoints.
- Read `https://renderingvideo.com/docs/json-spec.md` before drafting or changing schema JSON.
- Read `https://renderingvideo.com/docs/clips.md`, `https://renderingvideo.com/docs/elements.md`, and `https://renderingvideo.com/docs/elements/base-clip.md` when choosing clip types or fields.
- Read `https://renderingvideo.com/docs/animation-and-timing.md` when the task changes timing, transitions, or animations.

## Enforce These Rules

- Require an API key from `Settings > API Keys`.
- Send `Authorization: Bearer sk-...` on every request.
- Never place the API key in browser-side code.
- Prefer server-side calls or local scripts.
- Do not guess routes or response shapes from memory when `api-reference.md` covers them.

## Run The Script

Set `RENDERINGVIDEO_API_KEY` and run:

```bash
node ./scripts/rv-api.cjs <command> [...]
```

Use these commands:

- `preview <schema.json>`
- `create <schema.json> [create-options.json]`
- `render <taskId> [render-options.json]`
- `create-and-render <schema.json> [create-options.json] [render-options.json]`
- `task <taskId>`
- `tasks [querystring]`
- `credits`
- `upload <file> [more-files...]`
- `files [querystring]`
- `delete-file <fileId>`
- `delete-preview <tempId>`
- `convert-preview <tempId> [options.json]`
- `render-preview <tempId> [options.json]`

## Endpoint Mapping

- `preview`: `POST /api/v1/preview`, body is the schema itself
- `create`: `POST /api/v1/video`, body is `{ "config": schema, ...options }`
- `render`: `POST /api/v1/video/:taskId/render`
- `create-and-render`: create first, then render with the returned `taskId`
- `task`: `GET /api/v1/video/:taskId`
- `tasks`: `GET /api/v1/video`
- `credits`: `GET /api/v1/credits`
- `upload`: `POST /api/v1/upload`
- `files`: `GET /api/v1/files`
- `delete-file`: `DELETE /api/v1/files/:fileId`
- `delete-preview`: `DELETE /api/v1/preview/:tempId`
- `convert-preview`: `POST /api/v1/preview/:tempId/convert`
- `render-preview`: `POST /api/v1/preview/:tempId/render`

## Follow This Workflow

1. Read `json-spec.md`, `clips.md`, and the relevant element page.
2. Draft or update the schema JSON.
3. If the request needs hosted assets, call `upload` first and reuse returned URLs in the schema.
4. If the request needs validation only, call `preview`.
5. If the request needs a permanent task, call `create`.
6. If the request needs a rendered file, call `render`, `create-and-render`, or `render-preview`.
7. If the request needs billing or quota context, call `credits` or `files`.

## Keep These API Rules

- Treat `https://renderingvideo.com/docs/api-reference.md` as the source of truth for authenticated behavior.
- Use `webhook_url` only on render-start endpoints.
- `POST /api/v1/preview` does not consume credits but still requires auth.
- `POST /api/v1/video` creates a task but does not start rendering.
- `POST /api/v1/video/:taskId/render` may consume credits.
- Reuse the returned `viewerUrl`, `previewUrl`, `taskId`, `renderTaskId`, `videoUrl`, `tempId`, and uploaded asset URLs instead of guessing routes.

## Return These Fields

- For preview flows: return `tempId`, `previewUrl`, `viewerUrl`, and `expiresIn` when present.
- For task creation flows: return `taskId`, `previewUrl`, `viewerUrl`, `status`, and `configUrl` when present.
- For render flows: return `taskId`, `renderTaskId`, `status`, `videoUrl`, `remainingCredits`, and any preview URLs when present.
- For upload flows: return uploaded asset `id`, `url`, `type`, `mimeType`, and `size`.
- For listing flows: return the relevant objects and pagination fields without dropping identifiers.

## Handle Failures Explicitly

- If the API returns a non-2xx response, surface the HTTP status and the response body.
- If the response includes `code`, `error`, or `details`, preserve them in the answer.
- If auth fails, tell the user an API key is missing, invalid, inactive, or revoked.
- If credits are insufficient, surface that before proposing another render call.
