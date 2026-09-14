"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/agent.ts
var agent_exports = {};
__export(agent_exports, {
  AgentAuth: () => AgentAuth
});
module.exports = __toCommonJS(agent_exports);
var import_node_crypto = require("crypto");
var import_node_os = require("os");

// src/errors.ts
var RenderingVideoError = class extends Error {
  code;
  details;
  constructor(message, code, details = {}) {
    super(message);
    this.name = "RenderingVideoError";
    this.code = code;
    this.details = details;
  }
};
var AuthenticationError = class extends RenderingVideoError {
  constructor(message, details = {}, code = "AUTHENTICATION_ERROR") {
    super(message, code, details);
    this.name = "AuthenticationError";
  }
};
var InvalidApiKeyError = class extends RenderingVideoError {
  constructor(message, details = {}, code = "INVALID_API_KEY") {
    super(message, code, details);
    this.name = "InvalidApiKeyError";
  }
};
var InsufficientCreditsError = class extends RenderingVideoError {
  constructor(message, details = {}) {
    super(message, "INSUFFICIENT_CREDITS", details);
    this.name = "InsufficientCreditsError";
  }
};
var ValidationError = class extends RenderingVideoError {
  constructor(message, details = {}, code = "VALIDATION_ERROR") {
    super(message, code, details);
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends RenderingVideoError {
  constructor(message, details = {}) {
    super(message, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
};
var RateLimitError = class extends RenderingVideoError {
  constructor(message, details = {}, code = "RATE_LIMITED") {
    super(message, code, details);
    this.name = "RateLimitError";
  }
};
var AlreadyRenderingError = class extends RenderingVideoError {
  constructor(message, details = {}) {
    super(message, "ALREADY_RENDERING", details);
    this.name = "AlreadyRenderingError";
  }
};
var UploadError = class extends RenderingVideoError {
  constructor(message, details = {}, code = "UPLOAD_FAILED") {
    super(message, code, details);
    this.name = "UploadError";
  }
};
var StorageLimitError = class extends RenderingVideoError {
  constructor(message, details = {}, code = "STORAGE_LIMIT_EXCEEDED") {
    super(message, code, details);
    this.name = "StorageLimitError";
  }
};
var RemoteError = class extends RenderingVideoError {
  constructor(message, details = {}, code = "REMOTE_ERROR") {
    super(message, code, details);
    this.name = "RemoteError";
  }
};
function handleApiError(statusCode, message, code, details = {}) {
  switch (code) {
    case "MISSING_API_KEY":
    case "API_KEY_INACTIVE":
    case "USER_NOT_FOUND":
      return new AuthenticationError(message, { ...details, statusCode }, code);
    case "INVALID_API_KEY":
    case "INVALID_API_KEY_FORMAT":
      return new InvalidApiKeyError(message, { ...details, statusCode }, code);
    case "INSUFFICIENT_CREDITS":
      return new InsufficientCreditsError(message, { ...details, code, statusCode });
    case "INVALID_REQUEST":
    case "INVALID_CONFIG":
    case "NO_FILES":
    case "UNSUPPORTED_FILE_TYPE":
      return new ValidationError(message, { ...details, statusCode }, code);
    case "NOT_FOUND":
      return new NotFoundError(message, { ...details, code, statusCode });
    case "ALREADY_RENDERING":
      return new AlreadyRenderingError(message, { ...details, code, statusCode });
    case "STORAGE_LIMIT_EXCEEDED":
      return new StorageLimitError(message, { ...details, statusCode }, code);
    case "UPLOAD_FAILED":
      return new UploadError(message, { ...details, statusCode }, code);
    case "REMOTE_ERROR":
    case "RENDER_TRIGGER_FAILED":
      return new RemoteError(message, { ...details, statusCode }, code);
  }
  switch (statusCode) {
    case 401:
      return new AuthenticationError(message, { ...details, statusCode }, code);
    case 402:
      return new InsufficientCreditsError(message, { ...details, code, statusCode });
    case 400:
      return new ValidationError(message, { ...details, statusCode }, code);
    case 404:
      return new NotFoundError(message, { ...details, code, statusCode });
    case 429:
      return new RateLimitError(message, { ...details, statusCode }, code);
    default:
      return new RenderingVideoError(message, code, { ...details, statusCode });
  }
}

// src/agent.ts
var AgentAuth = class {
  constructor(options) {
    this.options = options;
    if (!options.agentKey?.startsWith("ak_")) throw new Error("Agent key must start with ak_");
    const url = new URL(options.baseUrl || "https://renderingvideo.com");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
      throw new Error("Agent API baseUrl must be an HTTPS origin (HTTP is allowed for localhost)");
    }
    this.baseUrl = url.origin;
    if (!options.device.id?.trim()) throw new Error("A persistent device ID is required");
    this.privateKey = (0, import_node_crypto.createPrivateKey)({ key: Buffer.from(options.device.privateKey, "base64url"), type: "pkcs8", format: "der" });
    const publicKey = (0, import_node_crypto.createPublicKey)(this.privateKey).export({ format: "jwk" });
    if (publicKey.crv !== "Ed25519" || publicKey.x !== options.device.publicKey) {
      throw new Error("Device public/private keys must be a matching Ed25519 pair");
    }
  }
  baseUrl;
  privateKey;
  token = null;
  pending = null;
  /** Generate once per device, then store and reuse the returned identity. */
  static generateDevice() {
    const keys = (0, import_node_crypto.generateKeyPairSync)("ed25519");
    return {
      id: (0, import_node_crypto.randomUUID)(),
      publicKey: keys.publicKey.export({ format: "jwk" }).x,
      privateKey: keys.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64url"),
      name: (0, import_node_os.hostname)(),
      platform: (0, import_node_os.platform)(),
      arch: (0, import_node_os.arch)()
    };
  }
  proof(credential, method, url) {
    const timestamp = Date.now().toString();
    const nonce = (0, import_node_crypto.randomBytes)(24).toString("base64url");
    const payload = [
      "RV-AGENT-PROOF-V1",
      method.toUpperCase(),
      url.pathname + url.search,
      timestamp,
      nonce,
      (0, import_node_crypto.createHash)("sha256").update(credential).digest("base64url")
    ].join("\n");
    return {
      "x-agent-device-id": this.options.device.id,
      "x-agent-timestamp": timestamp,
      "x-agent-nonce": nonce,
      "x-agent-signature": (0, import_node_crypto.sign)(null, Buffer.from(payload), this.privateKey).toString("base64url")
    };
  }
  async exchange() {
    const url = new URL("/api/agent/token", this.baseUrl);
    const { device, agentKey } = this.options;
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(this.options.timeout ?? 3e4),
      headers: { authorization: `AgentKey ${agentKey}`, "content-type": "application/json", ...this.proof(agentKey, "POST", url) },
      body: JSON.stringify({ device: {
        id: device.id,
        publicKey: device.publicKey,
        name: device.name || (0, import_node_os.hostname)(),
        platform: device.platform || (0, import_node_os.platform)(),
        arch: device.arch || (0, import_node_os.arch)(),
        agentVersion: "renderingvideo-nodejs-sdk/1.1"
      } })
    });
    const parsed = await response.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON response from agent API");
    const data = parsed;
    if (!response.ok || data?.success === false) {
      throw handleApiError(response.status, typeof data.error === "string" ? data.error : "Agent token exchange failed", typeof data.code === "string" ? data.code : "TOKEN_EXCHANGE_FAILED", data || {});
    }
    if (typeof data?.access_token !== "string" || !data.access_token.startsWith("at_") || typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error("Invalid agent token response");
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1e3 };
  }
  /** Explicitly discard a token after expiry/revocation; writes are never automatically replayed. */
  invalidate() {
    this.token = null;
  }
  async headers(method, url) {
    if (url.origin !== this.baseUrl || url.username || url.password || !/^\/api\/(v1|agent\/v1)\//.test(url.pathname)) throw new Error("Agent request is outside the configured API origin");
    if (!this.token || this.token.expiresAt <= Date.now() + 3e4) {
      this.pending ??= this.exchange().finally(() => {
        this.pending = null;
      });
      await this.pending;
    }
    const token = this.token.value;
    return { authorization: `Bearer ${token}`, ...this.proof(token, method, url) };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentAuth
});
