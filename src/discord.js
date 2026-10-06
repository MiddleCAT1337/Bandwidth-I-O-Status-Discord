const API_BASE = "https://discord.com/api/v10";

export class DiscordApiError extends Error {
  /** @param {number} status */
  constructor(status, message, retryAfterSec) {
    super(message);
    this.name = "DiscordApiError";
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * @param {string} token
 * @param {string} method
 * @param {string} path
 * @param {object} [body]
 */
async function request(token, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const retryHeader = res.headers.get("retry-after");
  const retryAfterSec = retryHeader ? Number(retryHeader) : undefined;

  if (res.status === 429) {
    throw new DiscordApiError(
      429,
      "Discord rate limited",
      Number.isFinite(retryAfterSec) ? retryAfterSec : 60
    );
  }

  if (res.status === 401) {
    throw new DiscordApiError(401, "Invalid or expired token");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new DiscordApiError(
      res.status,
      `Discord API ${res.status}: ${text.slice(0, 200)}`
    );
  }

  if (res.status === 204) return null;
  return res.json();
}

/** @param {string} token */
export async function getMe(token) {
  return request(token, "GET", "/users/@me");
}

/**
 * @param {string} token
 * @param {string | null} text
 */
export async function patchCustomStatus(token, text) {
  const payload =
    text === null
      ? { custom_status: null }
      : { custom_status: { text } };
  return request(token, "PATCH", "/users/@me/settings", payload);
}
