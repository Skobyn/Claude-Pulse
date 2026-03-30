import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DailySummaryRow {
  date: string;
  session_count: number;
  lines_added: number;
  lines_removed: number;
  net_lines: number;
  files_edited: number;
  files_created: number;
  files_read: number;
  tool_calls: number;
  skills_used: string;
  frameworks_detected: string;
  tool_counts: string;
}

interface SessionRow {
  id: string;
  project: string;
  started_at: string;
  duration_seconds: number | null;
  summary: string | null;
  tool_count: number;
  lines_added: number;
  lines_removed: number;
}

function parseJsonField(json: string): Record<string, number> {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

function mergeJsonCounts(
  maps: Record<string, number>[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) {
      if (k && v) result[k] = (result[k] || 0) + v;
    }
  }
  return result;
}

function toSortedPairs(
  map: Record<string, number>
): Array<{ name: string; count: number }> {
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function getRangeStart(range: string): string | null {
  const now = new Date();
  switch (range) {
    case "today": {
      return now.toISOString().split("T")[0];
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
      return d.toISOString().split("T")[0];
    }
    case "month": {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }
    case "all":
    default:
      return null;
  }
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";
    const rangeStart = getRangeStart(range);

    // Build date filter clauses
    const sessionDateFilter = rangeStart
      ? `WHERE started_at >= '${rangeStart}'`
      : "";
    const summaryDateFilter = rangeStart
      ? `WHERE date >= '${rangeStart}'`
      : "";

    // Total sessions and duration (filtered by range)
    const totals = db
      .prepare(
        `SELECT
          COUNT(*) as total_sessions,
          COALESCE(SUM(duration_seconds), 0) as total_duration,
          COUNT(DISTINCT project) as project_count
        FROM sessions ${sessionDateFilter}`
      )
      .get() as { total_sessions: number; total_duration: number; project_count: number };

    // Total lines from daily_summaries (filtered by range)
    const lineTotals = db
      .prepare(
        `SELECT
          COALESCE(SUM(lines_added), 0) as total_added,
          COALESCE(SUM(lines_removed), 0) as total_removed,
          COALESCE(SUM(net_lines), 0) as total_net
        FROM daily_summaries ${summaryDateFilter}`
      )
      .get() as { total_added: number; total_removed: number; total_net: number };

    // Current streak (always computed from all data)
    const streakDays = db
      .prepare(
        `SELECT DISTINCT date(started_at) as d
        FROM sessions
        ORDER BY d DESC
        LIMIT 90`
      )
      .all() as Array<{ d: string }>;

    let currentStreak = 0;
    if (streakDays.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mostRecent = new Date(streakDays[0].d + "T00:00:00");
      const diffFromToday = Math.floor(
        (today.getTime() - mostRecent.getTime()) / 86400000
      );

      if (diffFromToday <= 1) {
        currentStreak = 1;
        for (let i = 1; i < streakDays.length; i++) {
          const prev = new Date(streakDays[i - 1].d + "T00:00:00");
          const curr = new Date(streakDays[i].d + "T00:00:00");
          const gap = Math.floor(
            (prev.getTime() - curr.getTime()) / 86400000
          );
          if (gap === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Last 14 daily summaries aggregated across projects per day
    const dailyRows = db
      .prepare(
        `SELECT
          date,
          SUM(session_count) as session_count,
          SUM(lines_added) as lines_added,
          SUM(lines_removed) as lines_removed,
          SUM(net_lines) as net_lines,
          SUM(files_edited) + SUM(files_created) as files_edited,
          SUM(files_read) as files_read,
          SUM(tool_calls) as tool_calls,
          GROUP_CONCAT(skills_used, '|||') as skills_used,
          GROUP_CONCAT(frameworks_detected, '|||') as frameworks_detected,
          GROUP_CONCAT(tool_counts, '|||') as tool_counts
        FROM daily_summaries
        GROUP BY date
        ORDER BY date DESC
        LIMIT 14`
      )
      .all() as DailySummaryRow[];

    const dailyActivity = dailyRows.map((r) => ({
      date: r.date,
      sessions: r.session_count,
      lines: r.net_lines,
      files: r.files_edited + r.files_read,
      tools: r.tool_calls,
    }));

    // Aggregate skills, frameworks, tools (filtered by range)
    const allSummaries = db
      .prepare(
        `SELECT skills_used, frameworks_detected, tool_counts
        FROM daily_summaries ${summaryDateFilter}`
      )
      .all() as Array<{
      skills_used: string;
      frameworks_detected: string;
      tool_counts: string;
    }>;

    const skillsMaps = allSummaries.map((r) => parseJsonField(r.skills_used));
    const fwMaps = allSummaries.map((r) => parseJsonField(r.frameworks_detected));
    const toolMaps = allSummaries.map((r) => parseJsonField(r.tool_counts));

    const topSkills = toSortedPairs(mergeJsonCounts(skillsMaps)).slice(0, 10);
    const topFrameworks = toSortedPairs(mergeJsonCounts(fwMaps)).slice(0, 10);
    const toolDistribution = toSortedPairs(mergeJsonCounts(toolMaps)).slice(0, 10);

    // Recent 10 sessions with basic stats (filtered by range)
    const recentSessions = db
      .prepare(
        `SELECT
          s.id,
          s.project,
          s.started_at,
          s.duration_seconds,
          s.summary,
          COUNT(e.id) as tool_count,
          COALESCE(SUM(e.lines_added), 0) as lines_added,
          COALESCE(SUM(e.lines_removed), 0) as lines_removed
        FROM sessions s
        LEFT JOIN tool_events e ON e.session_id = s.id
        ${sessionDateFilter}
        GROUP BY s.id
        ORDER BY s.started_at DESC
        LIMIT 10`
      )
      .all() as SessionRow[];

    return Response.json({
      range,
      kpis: {
        totalSessions: totals.total_sessions,
        netLines: lineTotals.total_net,
        totalHours: totals.total_duration / 3600,
        projectCount: totals.project_count,
        currentStreak,
      },
      dailyActivity,
      topSkills,
      topFrameworks,
      toolDistribution,
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        project: s.project,
        duration: s.duration_seconds ?? 0,
        summary: s.summary,
        lines: s.lines_added - s.lines_removed,
        tools: s.tool_count,
        startedAt: s.started_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
