const MAX_STATUS_LEN = 128;

/**
 * @param {number} bytesPerSec
 */
export function formatRate(bytesPerSec) {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec < 0) return "--";
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) {
    const kb = bytesPerSec / 1024;
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB/s`;
  }
  const mb = bytesPerSec / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB/s`;
}

/**
 * @param {{ rxPerSec: number, txPerSec: number } | null} rates
 */
export function buildStatusText(rates) {
  if (!rates) {
    return "IN : -- OUT : --";
  }
  let text = `IN : ${formatRate(rates.rxPerSec)} OUT : ${formatRate(rates.txPerSec)}`;
  if (text.length > MAX_STATUS_LEN) {
    text = `IN:${formatRate(rates.rxPerSec)} OUT:${formatRate(rates.txPerSec)}`;
  }
  if (text.length > MAX_STATUS_LEN) {
    text = text.slice(0, MAX_STATUS_LEN);
  }
  return text;
}

export { MAX_STATUS_LEN };
