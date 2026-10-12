/** The channel report reads its own hashes and never adds them to legacy totals. */
export function eventReportOptions(args: string[], defaultMonth: string) {
  const channels = args.includes("--channels");
  const dates = args.filter((arg) => arg !== "--channels");
  const month = dates[0] ?? defaultMonth;
  if (dates.length > 1 || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month))
    throw new Error("Usage: npm run events -- [YYYY-MM] [--channels]");
  return { month, channels };
}

export const eventReportKey = (date: string, channels: boolean) =>
  `${channels ? "portfolio:event-channels:v1" : "portfolio:events:v1"}:day:${date}`;
