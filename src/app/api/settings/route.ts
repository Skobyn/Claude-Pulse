import { getDb, DB_PATH, DB_DIR } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    // DB size
    let dbSize = 0;
    try {
      const stat = fs.statSync(DB_PATH);
      dbSize = stat.size;
    } catch {
      // DB file may not exist yet
    }

    // Hook status
    const hookPath = path.join(DB_DIR, "hook.sh");
    const hookExists = fs.existsSync(hookPath);

    // Record counts
    const counts = db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM sessions) as sessions,
          (SELECT COUNT(*) FROM tool_events) as events,
          (SELECT COUNT(*) FROM daily_summaries) as summaries,
          (SELECT COUNT(*) FROM file_activity) as files`
      )
      .get() as {
      sessions: number;
      events: number;
      summaries: number;
      files: number;
    };

    return Response.json({
      dbPath: DB_PATH,
      dbSize,
      hookExists,
      hookPath,
      counts: {
        sessions: counts.sessions,
        events: counts.events,
        summaries: counts.summaries,
        fileActivity: counts.files,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getDb();

    db.exec("DELETE FROM file_activity");
    db.exec("DELETE FROM daily_summaries");
    db.exec("DELETE FROM tool_events");
    db.exec("DELETE FROM sessions");

    return Response.json({ ok: true, message: "All data cleared" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
