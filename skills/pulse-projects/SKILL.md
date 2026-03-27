---
name: pulse-projects
description: List all tracked projects with session counts, last activity, and recent insights. Use when the user asks "what projects am I working on", "show my projects", "list projects", or wants cross-project context.
argument-hint: [project-name]
allowed-tools: [Bash]
---

# Claude Pulse — Projects

Show all tracked projects or details for a specific one.

## Instructions

If the user provided a project name in $ARGUMENTS, show details for that project. Otherwise list all projects.

### List all projects

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT
  s.project,
  COUNT(DISTINCT s.id) as sessions,
  COALESCE(SUM(s.duration_seconds), 0) / 60 as total_minutes,
  MAX(s.started_at) as last_active,
  (SELECT COUNT(*) FROM insights i WHERE i.project = s.project) as insights,
  (SELECT content FROM insights i WHERE i.project = s.project AND i.type = 'progress' ORDER BY i.created_at DESC LIMIT 1) as last_progress
FROM sessions s
GROUP BY s.project
ORDER BY last_active DESC;
"
```

### Details for a specific project

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT type, content, created_at FROM insights
WHERE project = '<project-name>'
ORDER BY created_at DESC LIMIT 10;
"
```

Format the output as a clean table. For each project show:
- Project name
- Total sessions and time spent
- Last active date (as relative time like "2h ago" or "3 days ago")
- Number of insights
- Most recent progress entry (if any)

If showing a specific project, show the last 10 insights as a timeline.
