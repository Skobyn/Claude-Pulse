import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DayRow {
  date: string;
  sessions: number;
  duration: number;
  lines_added: number;
  lines_removed: number;
  net_lines: number;
  tool_calls: number;
}

export async function GET() {
  try {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT
          date,
          SUM(session_count) as sessions,
          SUM(total_duration_seconds) as duration,
          SUM(lines_added) as lines_added,
          SUM(lines_removed) as lines_removed,
          SUM(net_lines) as net_lines,
          SUM(tool_calls) as tool_calls
        FROM daily_summaries
        WHERE date >= date('now', '-90 days')
        GROUP BY date
        ORDER BY date ASC`
      )
      .all() as DayRow[];

    const days = rows.map((r) => ({
      date: r.date,
      sessions: r.sessions,
      duration: r.duration,
      linesAdded: r.lines_added,
      linesRemoved: r.lines_removed,
      netLines: r.net_lines,
      toolCalls: r.tool_calls,
    }));

    return Response.json({ days });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
