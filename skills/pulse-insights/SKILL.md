---
name: pulse-insights
description: Query the insights/brain database — search decisions, progress, blockers, patterns across all projects. Use when the user asks "what decisions did I make", "show me blockers", "what patterns have I noticed", "search my insights for X", or wants to find a past decision.
argument-hint: [search-term or type:progress|decision|blocked|pattern|fix]
allowed-tools: [Bash]
---

# Claude Pulse — Insights Query

Search and filter the insights database.

## Instructions

Parse $ARGUMENTS:
- If it starts with `type:` — filter by that insight type
- Otherwise — use it as a search term against content

### Filter by type

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT project, type, content, created_at
FROM insights
WHERE type = '<type>'
ORDER BY created_at DESC
LIMIT 20;
"
```

### Search by content

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT project, type, content, created_at
FROM insights
WHERE content LIKE '%<search-term>%'
ORDER BY created_at DESC
LIMIT 20;
"
```

### No arguments — show overview

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT type, COUNT(*) as count FROM insights GROUP BY type ORDER BY count DESC;
"
```

Then show the 5 most recent insights:

```bash
sqlite3 ~/.claude-pulse/tracker.db "
SELECT project, type, content, created_at
FROM insights
ORDER BY created_at DESC
LIMIT 5;
"
```

### How to present

Format as a timeline with type badges. Group by date if there are many results.
If searching, highlight the matching term in the results.
