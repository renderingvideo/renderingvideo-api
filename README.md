# rv-api — RenderingVideo API Skill

Authenticated video, preview, file and credit workflows using the user's API key. Requires Node.js 18+.

## Install

Clone this repository into your agent's skills directory using the short skill name:

```bash
git clone https://github.com/renderingvideo/rv-api.git rv-api
```

Then load `rv-api/SKILL.md` using your agent's skill discovery workflow. The skill identifier is `rv-api`. For an existing installation, pull the update and rename the old `renderingvideo-api` directory to `rv-api`. Update the existing clone’s Git remote to the renamed repository:

```bash
git remote set-url origin https://github.com/renderingvideo/rv-api.git
```

## Usage

Set `RENDERINGVIDEO_API_KEY` (`sk-...`) from Settings → API Keys in your secure environment. This public skill operates on that account's resources and does not support administrator Agent Access.

```bash
node scripts/rv-api.cjs --help
node scripts/rv-api.cjs capabilities --json
node scripts/rv-api.cjs preview examples/enhanced-schema.json --json
node scripts/rv-api.cjs tasks 'category=all&limit=20' --json
```

Optional settings: `RENDERINGVIDEO_API_ORIGIN` (app origin), `RENDERINGVIDEO_VIDEO_ORIGIN` (renderer origin), and `RENDERINGVIDEO_TIMEOUT_MS` (default 90000).

Creation options accept `title`, `category`, and `metadata`. Preview conversion/render options preserve `metadata`. `category=all` includes this account's website tasks; default listing remains `api`. Render options use `webhook_url` and `num_workers`. Quality follows schema dimensions. Creating or converting a task does not start rendering.

Append `--json` for machine-readable output. Mutating requests are not replayed automatically after failure.

See [SKILL.md](SKILL.md), [API reference](https://renderingvideo.com/docs/api-reference.md), and [schema reference](https://renderingvideo.com/docs/json-spec.md). On older deployments where capabilities returns 404, consult the live docs.

Run `node --test tests/*.test.cjs` for CLI checks. Cross-language API contract checks live in the website repository at `scripts/sdk-contract.test.ts`. Keep the website's `.claude/skills/rv-api` copy synchronized.
