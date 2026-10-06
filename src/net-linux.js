import fs from "node:fs";

const PROC_NET_DEV = "/proc/net/dev";

/**
 * Parse /proc/net/dev into { ifaceName: { rxBytes, txBytes } }.
 * @param {string} content
 */
export function parseProcNetDev(content) {
  const lines = content.trim().split("\n");
  const result = {};
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const name = line.slice(0, colon).trim();
    const parts = line.slice(colon + 1).trim().split(/\s+/);
    if (parts.length < 16) continue;
    result[name] = {
      rxBytes: BigInt(parts[0]),
      txBytes: BigInt(parts[8]),
    };
  }
  return result;
}

/**
 * @param {string} name
 * @param {string[]} excludePatterns
 */
function isExcluded(name, excludePatterns) {
  for (const pat of excludePatterns) {
    if (new RegExp(pat).test(name)) return true;
  }
  return false;
}

/**
 * @param {Record<string, { rxBytes: bigint, txBytes: bigint }>} byIface
 * @param {null | string | string[]} interfaceFilter
 * @param {string[]} excludePatterns
 */
export function sumBytes(byIface, interfaceFilter, excludePatterns) {
  let rx = 0n;
  let tx = 0n;

  if (interfaceFilter != null) {
    const names = Array.isArray(interfaceFilter)
      ? interfaceFilter
      : [interfaceFilter];
    for (const name of names) {
      const row = byIface[name];
      if (!row) {
        throw new Error(`Network interface not found: ${name}`);
      }
      rx += row.rxBytes;
      tx += row.txBytes;
    }
    return { rxBytes: rx, txBytes: tx };
  }

  for (const [name, row] of Object.entries(byIface)) {
    if (isExcluded(name, excludePatterns)) continue;
    rx += row.rxBytes;
    tx += row.txBytes;
  }
  return { rxBytes: rx, txBytes: tx };
}

export function readLinuxNetBytes(interfaceFilter, excludePatterns) {
  if (process.platform !== "linux") {
    throw new Error("Network stats require Linux (/proc/net/dev)");
  }
  const content = fs.readFileSync(PROC_NET_DEV, "utf8");
  const byIface = parseProcNetDev(content);
  return sumBytes(byIface, interfaceFilter, excludePatterns);
}

/**
 * @param {{ rxBytes: bigint, txBytes: bigint }} prev
 * @param {{ rxBytes: bigint, txBytes: bigint }} curr
 * @param {number} deltaMs
 * @returns {{ rxPerSec: number, txPerSec: number } | null}
 */
export function computeRates(prev, curr, deltaMs) {
  if (deltaMs <= 0) return null;
  let drx = curr.rxBytes - prev.rxBytes;
  let dtx = curr.txBytes - prev.txBytes;
  if (drx < 0n) drx = 0n;
  if (dtx < 0n) dtx = 0n;
  const sec = deltaMs / 1000;
  return {
    rxPerSec: Number(drx) / sec,
    txPerSec: Number(dtx) / sec,
  };
}
