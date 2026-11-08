/**
 * In-process counters for the daily summary (HLD section 11). They live in the web process's memory, so they
 * count since the last summary (or the last restart); the durable numbers come from the store.
 */
const counters = new Map<string, number>();

function key(name: string, labels?: Record<string, string>): string {
  if (!labels) return name;
  const parts = Object.keys(labels).sort().map((k) => `${k}=${labels[k]}`);
  return `${name}{${parts.join(",")}}`;
}

export const metrics = {
  inc(name: string, labels?: Record<string, string>, by = 1): void {
    const k = key(name, labels);
    counters.set(k, (counters.get(k) ?? 0) + by);
  },

  /** All counters, sorted by name; `reset` starts the next period. */
  snapshot(reset = false): Record<string, number> {
    const out: Record<string, number> = {};
    for (const k of [...counters.keys()].sort()) out[k] = counters.get(k)!;
    if (reset) counters.clear();
    return out;
  },
};
