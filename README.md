# renderingvideo-api

Authenticated RenderingVideo API skill for AI agents.

Use this skill when an agent needs to call the authenticated RenderingVideo REST API with:

- `Authorization: Bearer sk-...`
- `/api/v1/*` endpoints

This skill is for workflows such as:

- creating authenticated preview links
- creating permanent video tasks
- starting renders
- checking credits
- uploading files
- converting previews into permanent tasks

## Files

```text
renderingvideo-api/
+-- README.md
+-- SKILL.md
+-- example.json
+-- .gitignore
`-- scripts/
    `-- rv-api.cjs
```

## Included Resources

- `SKILL.md`: AI-facing execution rules
- `example.json`: minimal schema example
- `scripts/rv-api.cjs`: authenticated helper CLI for `/api/v1/*`

## Documentation Sources

Use these live docs as the source of truth:

- `https://renderingvideo.com/docs/api-reference.md`
- `https://renderingvideo.com/docs/json-spec.md`
- `https://renderingvideo.com/docs/clips.md`
- `https://renderingvideo.com/docs/elements.md`
- `https://renderingvideo.com/docs/elements/base-clip.md`
- `https://renderingvideo.com/docs/animation-and-timing.md`

## Requirements

- Node.js 18+
- network access to `https://renderingvideo.com`
- a RenderingVideo API key from `Settings > API Keys`

## Environment

Bash:

```bash
export RENDERINGVIDEO_API_KEY="sk-your-api-key"
```

PowerShell:

```powershell
$env:RENDERINGVIDEO_API_KEY = "sk-your-api-key"
```

Optional overrides:

- `RENDERINGVIDEO_API_ORIGIN`, default `https://renderingvideo.com`
- `RENDERINGVIDEO_VIDEO_ORIGIN`, default `https://video.renderingvideo.com`

## Usage

Create a preview:

```bash
node ./scripts/rv-api.cjs preview ./example.json
```

Create a permanent task:

```bash
node ./scripts/rv-api.cjs create ./example.json
```

Create and render:

```bash
node ./scripts/rv-api.cjs create-and-render ./example.json
```

Check credits:

```bash
node ./scripts/rv-api.cjs credits
```

## Supported Commands

```bash
node ./scripts/rv-api.cjs preview <schema.json>
node ./scripts/rv-api.cjs create <schema.json> [create-options.json]
node ./scripts/rv-api.cjs render <taskId> [render-options.json]
node ./scripts/rv-api.cjs create-and-render <schema.json> [create-options.json] [render-options.json]
node ./scripts/rv-api.cjs task <taskId>
node ./scripts/rv-api.cjs tasks [querystring]
node ./scripts/rv-api.cjs credits
node ./scripts/rv-api.cjs upload <file> [more-files...]
node ./scripts/rv-api.cjs files [querystring]
node ./scripts/rv-api.cjs delete-file <fileId>
node ./scripts/rv-api.cjs delete-preview <tempId>
node ./scripts/rv-api.cjs convert-preview <tempId> [options.json]
node ./scripts/rv-api.cjs render-preview <tempId> [options.json]
```

## API Rules

- always send `Authorization: Bearer ...`
- `POST /api/v1/preview` sends the schema itself
- `POST /api/v1/video` sends `{ "config": schema, ...options }`
- `POST /api/v1/video/:taskId/render` may consume credits
- preserve identifiers and returned URLs from API responses

## GitHub Usage

If you publish this skill in a GitHub repository:

- keep `README.md` human-facing
- keep `SKILL.md` AI-facing
- avoid duplicating large API tables from the docs
- update examples and commands when the API changes

