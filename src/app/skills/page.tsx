"use client";

import { useEffect, useState } from "react";

interface Skill {
  name: string;
  useCount: number;
  lastUsed: string;
  projects: string[];
}

interface SkillsData {
  skills: Skill[];
  total: number;
  generatedAt: string;
}

function getRecencyColor(lastUsed: string): {
  dot: string;
  badge: string;
  label: string;
} {
  const now = Date.now();
  const last = new Date(lastUsed).getTime();
  const days = (now - last) / (1000 * 60 * 60 * 24);

  if (days <= 7) {
    return {
      dot: "bg-green-500",
      badge: "bg-green-500/10 text-green-400 border-green-500/20",
      label: "active",
    };
  } else if (days <= 30) {
    return {
      dot: "bg-yellow-500",
      badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      label: "recent",
    };
  } else {
    return {
      dot: "bg-red-500",
      badge: "bg-red-500/10 text-red-400 border-red-500/20",
      label: "stale",
    };
  }
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / (86400 * 7))}w ago`;
  if (seconds < 86400 * 365) return `${Math.floor(seconds / (86400 * 30))}mo ago`;
  return `${Math.floor(seconds / (86400 * 365))}y ago`;
}

function SkillRow({ skill, rank }: { skill: Skill; rank: number }) {
  const recency = getRecencyColor(skill.lastUsed);

  return (
    <div className="flex items-center gap-4 rounded border border-zinc-800/50 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/30">
      {/* Rank */}
      <span className="w-6 text-right font-mono text-xs text-zinc-600">
        {rank}
      </span>

      {/* Recency dot */}
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${recency.dot}`} />

      {/* Skill name */}
      <span className="w-48 truncate font-mono text-sm text-zinc-200">
        {skill.name}
      </span>

      {/* Use count bar */}
      <div className="flex flex-1 items-center gap-3">
        <div className="relative h-1.5 flex-1 max-w-48 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-violet-500/70"
            style={{
              width: `${Math.min(100, (skill.useCount / Math.max(skill.useCount, 1)) * 100)}%`,
            }}
          />
        </div>
        <span className="w-8 text-right font-mono text-xs font-semibold text-zinc-300">
          {skill.useCount}
        </span>
      </div>

      {/* Last used */}
      <span
        className={`rounded border px-2 py-0.5 font-mono text-xs ${recency.badge}`}
      >
        {formatRelativeTime(skill.lastUsed)}
      </span>

      {/* Status label */}
      <span className="w-12 text-right font-mono text-xs text-zinc-600">
        {recency.label}
      </span>

      {/* Projects */}
      <div className="flex w-48 flex-wrap gap-1 justify-end">
        {skill.projects.slice(0, 3).map((p) => (
          <span
            key={p}
            className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-500"
          >
            {p}
          </span>
        ))}
        {skill.projects.length > 3 && (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
            +{skill.projects.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SkillsPage() {
  const [data, setData] = useState<SkillsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <p className="font-mono text-sm text-red-400">Failed to load: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="font-mono text-lg font-semibold">Skills</h1>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded border border-zinc-800 bg-zinc-900/50"
            />
          ))}
        </div>
      </div>
    );
  }

  const { skills } = data;

  // Separate active skills (>0 uses) from dead weight (detected but zero — not possible from DB alone)
  // Since we only track from DB, all returned skills have ≥1 use.
  // Partition by recency for visual grouping.
  const activeSkills = skills.filter((s) => {
    const days = (Date.now() - new Date(s.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  });

  const staleSkills = skills.filter((s) => {
    const days = (Date.now() - new Date(s.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    return days > 30;
  });

  // Max count for bar scaling
  const maxCount = skills.length > 0 ? skills[0].useCount : 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-lg font-semibold">Skills</h1>
        <div className="flex items-center gap-4 font-mono text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            active (&lt;7d)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            recent (7–30d)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            stale (&gt;30d)
          </span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-800 p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Total Skills Used
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50">
            {skills.length}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Active (7d)
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-green-400">
            {
              skills.filter(
                (s) =>
                  (Date.now() - new Date(s.lastUsed).getTime()) /
                    (1000 * 60 * 60 * 24) <=
                  7
              ).length
            }
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Total Invocations
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-violet-400">
            {skills.reduce((sum, s) => sum + s.useCount, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Dead Weight (&gt;30d)
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-red-400">
            {staleSkills.length}
          </p>
        </div>
      </div>

      {/* Skills Table */}
      {skills.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-8 text-center">
          <p className="font-mono text-sm text-zinc-500">
            No skill invocations recorded yet.
          </p>
          <p className="mt-2 font-mono text-xs text-zinc-600">
            Skills are tracked when Claude reads a SKILL.md file during a
            session.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header row */}
          <div className="rounded-lg border border-zinc-800 p-5">
            <div className="mb-4 flex items-center gap-4 px-4 font-mono text-xs uppercase tracking-wider text-zinc-600">
              <span className="w-6" />
              <span className="w-2" />
              <span className="w-48">Skill</span>
              <span className="flex-1">Usage</span>
              <span className="w-24 text-right">Last Used</span>
              <span className="w-12" />
              <span className="w-48 text-right">Projects</span>
            </div>

            {/* Active + recent skills */}
            <div className="space-y-1">
              {skills.map((skill, i) => {
                const days =
                  (Date.now() - new Date(skill.lastUsed).getTime()) /
                  (1000 * 60 * 60 * 24);
                if (days > 30) return null;
                return (
                  <div key={skill.name} className="flex items-center gap-4 rounded border border-zinc-800/50 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/30">
                    <span className="w-6 text-right font-mono text-xs text-zinc-600">{i + 1}</span>
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${getRecencyColor(skill.lastUsed).dot}`} />
                    <span className="w-48 truncate font-mono text-sm text-zinc-200">{skill.name}</span>
                    <div className="flex flex-1 items-center gap-3">
                      <div className="relative h-1.5 flex-1 max-w-48 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-violet-500/70"
                          style={{ width: `${(skill.useCount / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs font-semibold text-zinc-300">{skill.useCount}</span>
                    </div>
                    <span className={`rounded border px-2 py-0.5 font-mono text-xs ${getRecencyColor(skill.lastUsed).badge}`}>
                      {formatRelativeTime(skill.lastUsed)}
                    </span>
                    <span className="w-12 text-right font-mono text-xs text-zinc-600">{getRecencyColor(skill.lastUsed).label}</span>
                    <div className="flex w-48 flex-wrap gap-1 justify-end">
                      {skill.projects.slice(0, 3).map((p) => (
                        <span key={p} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-500">{p}</span>
                      ))}
                      {skill.projects.length > 3 && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-600">+{skill.projects.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dead Weight section */}
          {staleSkills.length > 0 && (
            <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-5">
              <h2 className="mb-1 font-mono text-xs uppercase tracking-wider text-red-500">
                Dead Weight — Not Used in 30+ Days
              </h2>
              <p className="mb-4 font-mono text-xs text-zinc-600">
                These skills were invoked before but haven't been used recently.
                Consider auditing or removing them.
              </p>
              <div className="space-y-1">
                {staleSkills.map((skill, i) => (
                  <div
                    key={skill.name}
                    className="flex items-center gap-4 rounded border border-red-900/20 px-4 py-3 opacity-70 transition-colors hover:opacity-100"
                  >
                    <span className="w-6 text-right font-mono text-xs text-zinc-600">{activeSkills.length + i + 1}</span>
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                    <span className="w-48 truncate font-mono text-sm text-zinc-400">{skill.name}</span>
                    <div className="flex flex-1 items-center gap-3">
                      <div className="relative h-1.5 flex-1 max-w-48 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-red-500/40"
                          style={{ width: `${(skill.useCount / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs font-semibold text-zinc-500">{skill.useCount}</span>
                    </div>
                    <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-xs text-red-400">
                      {formatRelativeTime(skill.lastUsed)}
                    </span>
                    <span className="w-12 text-right font-mono text-xs text-red-600">stale</span>
                    <div className="flex w-48 flex-wrap gap-1 justify-end">
                      {skill.projects.slice(0, 3).map((p) => (
                        <span key={p} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-600">{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
