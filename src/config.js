import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = path.join(__dirname, "..", "config.json");

const DEFAULT_EXCLUDE = ["^docker", "^veth", "^br-", "^lo"];

/**
 * @param {string} [configPath]
 */
export function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Missing ${configPath}. Create it (see README).`
    );
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    throw new Error(`Invalid JSON in ${configPath}: ${e.message}`);
  }

  const token = raw.token;
  if (typeof token !== "string" || token.trim() === "") {
    throw new Error("config.json: set a valid token string");
  }

  let updateIntervalMs = raw.updateIntervalMs ?? 15000;
  if (typeof updateIntervalMs !== "number" || updateIntervalMs < 1000) {
    throw new Error("config.json: updateIntervalMs must be a number >= 1000");
  }
  if (updateIntervalMs < 5000) {
    console.warn(
      "Warning: updateIntervalMs < 5000 may trigger Discord rate limits"
    );
  }

  let interfaceFilter = raw.interface ?? null;
  if (
    interfaceFilter !== null &&
    typeof interfaceFilter !== "string" &&
    !(
      Array.isArray(interfaceFilter) &&
      interfaceFilter.every((x) => typeof x === "string")
    )
  ) {
    throw new Error(
      'config.json: interface must be null, a string, or an array of strings'
    );
  }

  let excludePatterns = raw.excludePatterns ?? DEFAULT_EXCLUDE;
  if (
    !Array.isArray(excludePatterns) ||
    !excludePatterns.every((x) => typeof x === "string")
  ) {
    throw new Error("config.json: excludePatterns must be an array of strings");
  }

  const clearOnExit = Boolean(raw.clearOnExit);

  return {
    token: token.trim(),
    updateIntervalMs,
    interface: interfaceFilter,
    excludePatterns,
    clearOnExit,
  };
}
