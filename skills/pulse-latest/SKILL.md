---
name: pulse-latest
description: Show the latest work across all projects — recent sessions, what was accomplished, and what's blocked. Use when the user asks "what did I work on", "what's the latest", "show recent activity", "where did I leave off", or wants a cross-project summary.
argument-hint: [number-of-days]
allowed-tools: [Bash]
---

# Claude Pulse — Latest Work

Show recent activity and insights across all projects.

## Instructions

The user may specify a number of days in $ARGUMENTS (default: 3).

### Step 1: Recent sessions

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT
  project,
  started_at,
  duration_seconds / 60 as minutes,
  status,
  substr(summary, 1, 200) as summary
FROM sessions
WHERE started_at >= datetime('now', '-${DAYS} days')
ORDER BY started_at DESC
LIMIT 20;
"
```

### Step 2: Recent insights (the brain)

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT
  project,
  type,
  content,
  created_at
FROM insights
WHERE created_at >= datetime('now', '-${DAYS} days')
ORDER BY created_at DESC
LIMIT 20;
"
```

### Step 3: Currently blocked items

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT project, content, created_at
FROM insights
WHERE type = 'blocked'
ORDER BY created_at DESC
LIMIT 5;
"
```

### How to present

Group by project. For each project show:
1. Sessions in the time period (count, total time)
2. Key progress entries
3. Key decisions
4. Any active blockers

End with a summary: "Across X projects in the last Y days: Z sessions, N insights captured."

If there are active blockers, highlight them at the top.
