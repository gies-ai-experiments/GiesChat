#!/usr/bin/env bash
# Gather the git signal the `update` skill needs to see what has shipped
# since CLAUDE.md was last brought up to date.
#
# Usage: gather_context.sh [path-to-CLAUDE.md]
#   Defaults to ./CLAUDE.md (run from the repo root, or pass a path).
#
# Output is plain text grouped under "## " headers, meant to be read by the
# model — not parsed. It deliberately stays read-only: nothing here mutates
# the repo.

set -euo pipefail

CLAUDE_MD="${1:-CLAUDE.md}"
MAX_COMMITS=60

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "## Not in a git repository"
  echo "No git history available. Rely on the current conversation instead."
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel)"

echo "## Current date"
date +%Y-%m-%d
echo

echo "## Repo root"
echo "$ROOT"
echo

echo "## CLAUDE.md path"
if [ -f "$CLAUDE_MD" ]; then
  echo "$CLAUDE_MD"
else
  echo "$CLAUDE_MD (NOT FOUND on disk — confirm the path)"
fi
echo

# Anchor: the last commit that actually changed CLAUDE.md. Commits after this
# are the work the doc has not had a chance to reflect yet.
LAST_LINE="$(git log -1 --format='%H%x09%cI%x09%s' -- "$CLAUDE_MD" 2>/dev/null || true)"

if [ -n "$LAST_LINE" ]; then
  LAST_HASH="${LAST_LINE%%	*}"
  echo "## Last commit that touched CLAUDE.md"
  echo "${LAST_LINE#*	}"
  echo

  TOTAL="$(git rev-list --count "${LAST_HASH}..HEAD" 2>/dev/null || echo 0)"
  echo "## Commits since CLAUDE.md was last updated ($TOTAL total, newest first)"
  if [ "$TOTAL" -gt "$MAX_COMMITS" ]; then
    echo "(showing the most recent $MAX_COMMITS of $TOTAL — older ones truncated)"
  fi
  git log --format='%h %cI %s' -n "$MAX_COMMITS" "${LAST_HASH}..HEAD" 2>/dev/null || true
  echo

  echo "## Files changed since then (churn — points at what moved/grew)"
  git diff --stat "${LAST_HASH}..HEAD" 2>/dev/null || true
  echo
else
  echo "## CLAUDE.md has no commit history"
  echo "(new/untracked file, or never committed). Showing the 30 most recent commits:"
  git log --format='%h %cI %s' -n 30 2>/dev/null || true
  echo
fi

# Uncommitted work is not in scope by default, but a one-line heads-up helps the
# model notice when meaningful changes exist that the git log above won't show.
DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [ "$DIRTY" != "0" ]; then
  echo "## Heads-up: working tree has $DIRTY uncommitted change(s)"
  echo "These are NOT in the commit log above. Mention them only if the user"
  echo "asked to include uncommitted work."
fi
