// Prints a month of conversion counts from the production store, one row per
// event and value, one column per week. Needs the Redis REST credentials in
// the environment (`vercel env pull`, then load .env.local):
// npm run events -- 2026-10 [--channels]
import { eventReportKey, eventReportOptions } from "./event-report";

const { month, channels } = eventReportOptions(
  process.argv.slice(2),
  new Date().toISOString().slice(0, 7),
);
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
if (!url || !token)
  throw new Error("Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");

async function command<T>(...args: (string | number)[]): Promise<T> {
  const response = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(args),
  });
  const data = (await response.json()) as { result: T; error?: string };
  if (!response.ok || data.error)
    throw new Error(`Redis: ${data.error ?? response.status}`);
  return data.result;
}

async function main() {
  const [year, monthIndex] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const totals = new Map<string, number[]>();
  for (let day = 1; day <= days; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const fields = await command<string[]>(
      "HGETALL",
      eventReportKey(date, channels),
    );
    const week = Math.min(3, Math.floor((day - 1) / 7));
    for (let i = 0; i < fields.length; i += 2) {
      const row = totals.get(fields[i]) ?? [0, 0, 0, 0];
      row[week] += Number(fields[i + 1]);
      totals.set(fields[i], row);
    }
  }
  const rows = [...totals]
    .map(([event, weeks]) => ({
      event: channels ? event.slice(0, event.lastIndexOf(":")) : event,
      ...(channels ? { channel: event.slice(event.lastIndexOf(":") + 1) } : {}),
      "1–7": weeks[0],
      "8–14": weeks[1],
      "15–21": weeks[2],
      [`22–${days}`]: weeks[3],
      total: weeks.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total || a.event.localeCompare(b.event));
  console.log(
    `${channels ? "Conversion event channels" : "Conversion events"}, ${month} (UTC days)`,
  );
  if (rows.length) console.table(rows);
  else console.log("No events counted.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
