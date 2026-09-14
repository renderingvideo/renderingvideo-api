#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { AgentAuth } = require('./agent-auth.cjs');

const API_ORIGIN = process.env.RENDERINGVIDEO_API_ORIGIN || process.env.RENDERINGVIDEO_API_BASE_URL || 'https://renderingvideo.com';
const VIDEO_ORIGIN = process.env.RENDERINGVIDEO_VIDEO_ORIGIN || 'https://video.renderingvideo.com';
const JSON_OUTPUT = process.argv.includes('--json');
const AGENT_KEY = process.env.RENDERINGVIDEO_AGENT_KEY || '';
const TIMEOUT = Number(process.env.RENDERINGVIDEO_TIMEOUT_MS || 90000);
let agentAuth;

const API_KEY = process.env.RENDERINGVIDEO_API_KEY || process.env.RV_API_KEY || '';

function printUsage() {
  console.log(`
RenderingVideo Authenticated API Helper

Usage:
  node ./scripts/rv-api.cjs capabilities
  node ./scripts/rv-api.cjs context
  node ./scripts/rv-api.cjs audit [querystring]
  node ./scripts/rv-api.cjs get-preview <tempId>
  node ./scripts/rv-api.cjs delete-task <taskId>
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

Environment:
  RENDERINGVIDEO_API_KEY   API key (sk-), or use the agent key below.
  RENDERINGVIDEO_AGENT_KEY Agent key (ak_); exchanges and signs device requests.
  RENDERINGVIDEO_AGENT_STATE_DIR Optional absolute directory for device identity.
  RENDERINGVIDEO_TIMEOUT_MS Optional positive request timeout (default: 90000).
  Append --json for machine-readable output.
  RENDERINGVIDEO_API_ORIGIN  Optional. Default: https://renderingvideo.com
  RENDERINGVIDEO_VIDEO_ORIGIN Optional. Default: https://video.renderingvideo.com
`);
}

function requireApiKey() {
  if (API_KEY && AGENT_KEY) throw new Error('Set RENDERINGVIDEO_API_KEY or RENDERINGVIDEO_AGENT_KEY, not both.');
  if (!API_KEY && !AGENT_KEY) throw new Error('Set RENDERINGVIDEO_API_KEY (sk-) or RENDERINGVIDEO_AGENT_KEY (ak_).');
  if (API_KEY && !API_KEY.startsWith('sk-')) throw new Error('API key must start with sk-.');
  if (!Number.isFinite(TIMEOUT) || TIMEOUT <= 0) throw new Error('RENDERINGVIDEO_TIMEOUT_MS must be positive.');
}

function getAgentAuth() {
  if (agentAuth) return agentAuth;
  const directory = process.env.RENDERINGVIDEO_AGENT_STATE_DIR || path.join(os.homedir(), '.config', 'renderingvideo-agent');
  if (!path.isAbsolute(directory)) throw new Error('Agent state directory must be an absolute path.');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!fs.lstatSync(directory).isDirectory()) throw new Error('Agent state directory must not be a symlink.');
  const filename = path.join(directory, 'device.json');
  if (!fs.existsSync(filename)) {
    try { fs.writeFileSync(filename, JSON.stringify(AgentAuth.generateDevice()), { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const info = fs.fstatSync(fd);
    if (!info.isFile() || (process.platform !== 'win32' && (info.mode & 0o077) !== 0)) {
      throw new Error('Device key file must be a regular file readable only by its owner.');
    }
    const device = JSON.parse(fs.readFileSync(fd, 'utf8'));
    agentAuth = new AgentAuth({ agentKey: AGENT_KEY, device, baseUrl: API_ORIGIN, timeout: TIMEOUT });
  } finally { fs.closeSync(fd); }
  return agentAuth;
}

function resolveFile(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  return fullPath;
}

function readJson(filePath) {
  const fullPath = resolveFile(filePath);
  const raw = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function toAbsoluteUrl(value, origin = VIDEO_ORIGIN) {
  if (!value || typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, origin).toString();
}

function buildUrl(pathname, querystring) {
  const url = new URL(pathname, API_ORIGIN);
  if (querystring) {
    const params = new URLSearchParams(querystring);
    url.search = params.toString();
  }
  return url;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function apiRequest(method, pathname, options = {}) {
  requireApiKey();

  const url = buildUrl(pathname, options.querystring);
  const headers = {
    ...(AGENT_KEY ? await getAgentAuth().headers(method, url) : { Authorization: `Bearer ${API_KEY}` }),
    ...options.headers,
  };

  const init = { method, headers, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT) };

  if (options.json !== undefined) {
    init.body = JSON.stringify(options.json);
    init.headers['Content-Type'] = 'application/json';
  }

  if (options.formData) {
    init.body = options.formData;
  }

  const response = await fetch(url, init);
  const body = await parseResponse(response);

  if (!response.ok || body?.success === false) {
    const detail =
      typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    throw new Error(`HTTP ${response.status} ${response.statusText}\n${detail}`);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('API returned an invalid JSON object.');
  return body;
}

function printJson(title, data) {
  if (JSON_OUTPUT) { console.log(JSON.stringify(data)); return; }
  console.log(`\n${title}`);
  console.log('-----------------------------------');
  console.log(JSON.stringify(data, null, 2));
  console.log('-----------------------------------\n');
}

function printPreviewSummary(response) {
  if (JSON_OUTPUT) return;
  const previewUrl = toAbsoluteUrl(response.previewUrl || response.url);
  const viewerUrl = toAbsoluteUrl(response.viewerUrl || response.url);

  console.log('\nAuthenticated preview created');
  console.log('-----------------------------------');
  if (response.tempId) console.log(`Temp ID: ${response.tempId}`);
  if (previewUrl) console.log(`Preview URL: ${previewUrl}`);
  if (viewerUrl) console.log(`Viewer URL: ${viewerUrl}`);
  if (response.expiresIn) console.log(`Expires: ${response.expiresIn}`);
  console.log('-----------------------------------\n');
}

function printTaskSummary(response) {
  if (JSON_OUTPUT) return;
  console.log('\nVideo task response');
  console.log('-----------------------------------');
  if (response.taskId) console.log(`Task ID: ${response.taskId}`);
  if (response.renderTaskId) console.log(`Render Task ID: ${response.renderTaskId}`);
  if (response.status) console.log(`Status: ${response.status}`);
  if (response.previewUrl) console.log(`Preview URL: ${toAbsoluteUrl(response.previewUrl)}`);
  if (response.viewerUrl) console.log(`Viewer URL: ${toAbsoluteUrl(response.viewerUrl)}`);
  if (response.videoUrl) console.log(`Video URL: ${toAbsoluteUrl(response.videoUrl, API_ORIGIN)}`);
  if (response.remainingCredits !== undefined) console.log(`Remaining Credits: ${response.remainingCredits}`);
  if (response.message) console.log(`Message: ${response.message}`);
  console.log('-----------------------------------\n');
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.aac': 'audio/aac',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.mpeg': 'video/mpeg',
    '.ogg': 'audio/ogg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.mov': 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

async function uploadFiles(filePaths) {
  if (!filePaths.length) {
    throw new Error('upload requires at least one file path.');
  }

  const formData = new FormData();

  for (const filePath of filePaths) {
    const fullPath = resolveFile(filePath);
    const buffer = fs.readFileSync(fullPath);
    const blob = new Blob([buffer], { type: guessMimeType(fullPath) });
    formData.append(filePaths.length === 1 ? 'file' : 'files', blob, path.basename(fullPath));
  }

  return apiRequest('POST', '/api/v1/upload', { formData });
}

async function main() {
  const [command, ...args] = process.argv.slice(2).filter((arg) => arg !== '--json');

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  try {
    switch (command) {
      case 'capabilities':
        printJson('API capabilities', await apiRequest('GET', '/api/v1/capabilities'));
        return;
      case 'context':
      case 'audit':
        if (!AGENT_KEY) throw new Error('context/audit require RENDERINGVIDEO_AGENT_KEY.');
        printJson(command, await apiRequest('GET', `/api/agent/v1/${command}`, { querystring: args[0] }));
        return;
      case 'get-preview':
        if (!args[0]) throw new Error('get-preview requires <tempId>.');
        printJson('Preview config', await apiRequest('GET', `/api/v1/preview/${encodeURIComponent(args[0])}`));
        return;
      case 'delete-task':
        if (!args[0]) throw new Error('delete-task requires <taskId>.');
        printJson('Delete task', await apiRequest('DELETE', `/api/v1/video/${encodeURIComponent(args[0])}`));
        return;
      case 'preview': {
        if (!args[0]) throw new Error('preview requires <schema.json>.');
        const schema = readJson(args[0]);
        const response = await apiRequest('POST', '/api/v1/preview', { json: schema });
        printPreviewSummary(response);
        printJson('Raw response', response);
        return;
      }

      case 'create': {
        if (!args[0]) throw new Error('create requires <schema.json>.');
        const schema = readJson(args[0]);
        const options = args[1] ? readJson(args[1]) : {};
        const response = await apiRequest('POST', '/api/v1/video', {
          json: { ...options, config: schema },
        });
        printTaskSummary(response);
        printJson('Raw response', response);
        return;
      }

      case 'render': {
        if (!args[0]) throw new Error('render requires <taskId>.');
        const options = args[1] ? readJson(args[1]) : {};
        const response = await apiRequest('POST', `/api/v1/video/${encodeURIComponent(args[0])}/render`, {
          json: options,
        });
        printTaskSummary(response);
        printJson('Raw response', response);
        return;
      }

      case 'create-and-render': {
        if (!args[0]) throw new Error('create-and-render requires <schema.json>.');
        const schema = readJson(args[0]);
        const createOptions = args[1] ? readJson(args[1]) : {};
        const renderOptions = args[2] ? readJson(args[2]) : {};
        const createResponse = await apiRequest('POST', '/api/v1/video', {
          json: { ...createOptions, config: schema },
        });
        printTaskSummary(createResponse);
        const renderResponse = await apiRequest(
          'POST',
          `/api/v1/video/${encodeURIComponent(createResponse.taskId)}/render`,
          { json: renderOptions }
        );
        printTaskSummary(renderResponse);
        printJson('Create and render response', { create: createResponse, render: renderResponse });
        return;
      }

      case 'task': {
        if (!args[0]) throw new Error('task requires <taskId>.');
        const response = await apiRequest('GET', `/api/v1/video/${encodeURIComponent(args[0])}`);
        printTaskSummary(response);
        printJson('Raw response', response);
        return;
      }

      case 'tasks': {
        const response = await apiRequest('GET', '/api/v1/video', {
          querystring: args[0],
        });
        printJson('Task list', response);
        return;
      }

      case 'credits': {
        const response = await apiRequest('GET', '/api/v1/credits');
        printJson('Credit balance', response);
        return;
      }

      case 'upload': {
        const response = await uploadFiles(args);
        printJson('Upload response', response);
        return;
      }

      case 'files': {
        const response = await apiRequest('GET', '/api/v1/files', {
          querystring: args[0],
        });
        printJson('Files', response);
        return;
      }

      case 'delete-file': {
        if (!args[0]) throw new Error('delete-file requires <fileId>.');
        const response = await apiRequest('DELETE', `/api/v1/files/${encodeURIComponent(args[0])}`);
        printJson('Delete file response', response);
        return;
      }

      case 'delete-preview': {
        if (!args[0]) throw new Error('delete-preview requires <tempId>.');
        const response = await apiRequest('DELETE', `/api/v1/preview/${encodeURIComponent(args[0])}`);
        printJson('Delete preview response', response);
        return;
      }

      case 'convert-preview': {
        if (!args[0]) throw new Error('convert-preview requires <tempId>.');
        const options = args[1] ? readJson(args[1]) : {};
        const response = await apiRequest('POST', `/api/v1/preview/${encodeURIComponent(args[0])}/convert`, {
          json: options,
        });
        printTaskSummary(response);
        printJson('Raw response', response);
        return;
      }

      case 'render-preview': {
        if (!args[0]) throw new Error('render-preview requires <tempId>.');
        const options = args[1] ? readJson(args[1]) : {};
        const response = await apiRequest('POST', `/api/v1/preview/${encodeURIComponent(args[0])}/render`, {
          json: options,
        });
        printTaskSummary(response);
        printJson('Raw response', response);
        return;
      }

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
