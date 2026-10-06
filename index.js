import { loadConfig } from "./src/config.js";
import { buildStatusText } from "./src/format.js";
import {
  DiscordApiError,
  getMe,
  patchCustomStatus,
} from "./src/discord.js";
import {
  computeRates,
  readLinuxNetBytes,
} from "./src/net-linux.js";

async function main() {
  const config = loadConfig();

  if (process.platform !== "linux") {
    console.error("This script must run on Linux (Ubuntu).");
    process.exit(1);
  }

  let user;
  try {
    user = await getMe(config.token);
  } catch (e) {
    if (e instanceof DiscordApiError && e.status === 401) {
      console.error("Token rejected (401). Check config.json.");
      process.exit(1);
    }
    throw e;
  }

  console.log(`Logged in as ${user.username}. Updating custom status every ${config.updateIntervalMs}ms.`);

  /** @type {{ rxBytes: bigint, txBytes: bigint, at: number } | null} */
  let prevSample = null;
  let lastStatusText = null;
  let stopped = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  async function tick() {
    if (stopped) return;

    const now = Date.now();
    let bytes;
    try {
      bytes = readLinuxNetBytes(config.interface, config.excludePatterns);
    } catch (e) {
      console.error("Network read failed:", e.message);
      scheduleNext();
      return;
    }

    let rates = null;
    if (prevSample) {
      rates = computeRates(
        { rxBytes: prevSample.rxBytes, txBytes: prevSample.txBytes },
        bytes,
        now - prevSample.at
      );
    }
    prevSample = { ...bytes, at: now };

    const text = buildStatusText(rates);
    if (text === lastStatusText) {
      scheduleNext();
      return;
    }

    try {
      await patchCustomStatus(config.token, text);
      lastStatusText = text;
      console.log(new Date().toISOString(), text);
    } catch (e) {
      if (e instanceof DiscordApiError) {
        if (e.status === 401) {
          console.error("Token rejected (401). Stopping.");
          shutdown(1);
          return;
        }
        if (e.status === 429) {
          const waitMs = (e.retryAfterSec ?? 60) * 1000;
          console.warn(`Rate limited. Backing off ${waitMs}ms`);
          timer = setTimeout(tick, waitMs);
          return;
        }
      }
      console.error("Discord update failed:", e.message);
    }

    scheduleNext();
  }

  function scheduleNext() {
    if (stopped) return;
    timer = setTimeout(tick, config.updateIntervalMs);
  }

  function shutdown(code = 0) {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);

    if (config.clearOnExit) {
      patchCustomStatus(config.token, null)
        .then(() => console.log("Custom status cleared."))
        .catch((e) => console.error("Failed to clear status:", e.message))
        .finally(() => process.exit(code));
      return;
    }
    process.exit(code);
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  tick();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
