/** Runs once when the Node server starts (Next.js instrumentation hook): schedules the daily ops summary. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleDailyReport } = await import("./lib/server/ops");
    scheduleDailyReport();
  }
}
