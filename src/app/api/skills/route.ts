import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SkillRow {
  skill_name: string;
  use_count: number;
  last_used: string;
  projects: string;
}

interface AllSkillRow {
  file_path: string;
  use_count: number;
  last_used: string;
  projects: string;
}

function extractSkillName(filePath: string): string {
  // Match patterns like:
  //   .../skills/skill-name/SKILL.md
  //   .../skills/skill-name/SKILL.md (any depth)
  const match = filePath.match(/skills\/([^/]+)\/SKILL\.md/i);
  if (match) return match[1];
  // Fallback: parent directory name
  const parts = filePath.replace(/\\/g, "/").split("/");
  const idx = parts.indexOf("SKILL.md");
  if (idx > 0) return parts[idx - 1];
  return "unknown";
}

export async function GET() {
  try {
    const db = getDb();

    // Query tool_events for Read calls on SKILL.md files
    const rawRows = db
      .prepare(
        `SELECT
          file_path,
          COUNT(*) as use_count,
          MAX(timestamp) as last_used,
          GROUP_CONCAT(DISTINCT s.project) as projects
        FROM tool_events te
        JOIN sessions s ON s.id = te.session_id
        WHERE te.tool_name = 'Read'
          AND te.file_path LIKE '%SKILL.md%'
        GROUP BY te.file_path
        ORDER BY use_count DESC`
      )
      .all() as AllSkillRow[];

    // Aggregate by skill name (multiple paths can map to same skill)
    const skillMap = new Map<
      string,
      { use_count: number; last_used: string; projects: Set<string> }
    >();

    for (const row of rawRows) {
      const skillName = extractSkillName(row.file_path);
      const existing = skillMap.get(skillName);
      const projects = row.projects
        ? row.projects.split(",").filter(Boolean)
        : [];

      if (existing) {
        existing.use_count += row.use_count;
        if (row.last_used > existing.last_used) {
          existing.last_used = row.last_used;
        }
        projects.forEach((p) => existing.projects.add(p));
      } else {
        skillMap.set(skillName, {
          use_count: row.use_count,
          last_used: row.last_used,
          projects: new Set(projects),
        });
      }
    }

    // Convert to array and sort by use count
    const skills = Array.from(skillMap.entries())
      .map(([name, data]) => ({
        name,
        useCount: data.use_count,
        lastUsed: data.last_used,
        projects: Array.from(data.projects),
      }))
      .sort((a, b) => b.useCount - a.useCount);

    // Find all known skills from file system (to show zero-use skills)
    // We detect known skill paths from any stored file reads that ended in SKILL.md
    // (already covered above) — zero-use skills are ones in the skill dirs but never read.
    // Since we don't scan the FS here, zero-use detection is based on having no events.
    // The "dead weight" section will just be skills with 0 uses from a known list.
    // We can't enumerate all installed skills from the DB alone — that's fine.

    return Response.json({
      skills,
      total: skills.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
