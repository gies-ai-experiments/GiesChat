#!/usr/bin/env bash
# Gathers git state + divergence data for the gitpull skill so the
# "is this diverging massively?" decision is made from real numbers.
# Usage: preflight.sh [TARGET_BRANCH]
#   TARGET_BRANCH - the branch to pull (defaults to current branch).
# Emits KEY=VALUE lines. Does a read-only fetch; never merges/resets.
set -uo pipefail

TARGET="${1:-}"

emit() { printf '%s=%s\n' "$1" "$2"; }

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  emit IS_GIT_REPO false
  exit 0
fi
emit IS_GIT_REPO true

CURRENT_BRANCH="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo 'DETACHED')"
emit CURRENT_BRANCH "$CURRENT_BRANCH"

LOCAL_BRANCHES="$(git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null | paste -sd, -)"
emit LOCAL_BRANCHES "${LOCAL_BRANCHES:-}"

ORIGIN_URL="$(git remote get-url origin 2>/dev/null)"
if [ -z "$ORIGIN_URL" ]; then
  emit HAS_ORIGIN false
  exit 0
fi
emit HAS_ORIGIN true
emit ORIGIN_URL "$ORIGIN_URL"

# Default to the current branch when no target is supplied.
[ -z "$TARGET" ] && TARGET="$CURRENT_BRANCH"
emit TARGET_BRANCH "$TARGET"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  emit WORKTREE_DIRTY true
  emit UNCOMMITTED_COUNT "$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
else
  emit WORKTREE_DIRTY false
  emit UNCOMMITTED_COUNT 0
fi

if git fetch --quiet origin >/dev/null 2>&1; then
  emit FETCH_OK true
else
  emit FETCH_OK false
  exit 0
fi

REMOTE_REF="origin/${TARGET}"
if ! git show-ref --verify --quiet "refs/remotes/${REMOTE_REF}"; then
  emit REMOTE_BRANCH_EXISTS false
  exit 0
fi
emit REMOTE_BRANCH_EXISTS true

# Local side of the comparison: the target branch if it exists locally,
# otherwise HEAD (the branch the changes would land on).
if git show-ref --verify --quiet "refs/heads/${TARGET}"; then
  LOCAL_REF="$TARGET"
  emit LOCAL_BRANCH_EXISTS true
else
  LOCAL_REF="HEAD"
  emit LOCAL_BRANCH_EXISTS false
fi
emit LOCAL_REF "$LOCAL_REF"

# Divergence: BEHIND = commits on remote not local; AHEAD = local not on remote.
set -- $(git rev-list --left-right --count "${REMOTE_REF}...${LOCAL_REF}" 2>/dev/null)
BEHIND="${1:-0}"
AHEAD="${2:-0}"
emit BEHIND "$BEHIND"
emit AHEAD "$AHEAD"

# Fast-forwardable? (local is an ancestor of remote => clean pull, no merge)
if git merge-base --is-ancestor "$LOCAL_REF" "$REMOTE_REF" 2>/dev/null; then
  emit FAST_FORWARD true
else
  emit FAST_FORWARD false
fi

# Size of the incoming change vs the local ref (the "how big" signal).
DIFFSTAT="$(git diff --shortstat "${LOCAL_REF}...${REMOTE_REF}" 2>/dev/null | sed 's/^ *//')"
emit INCOMING_DIFFSTAT "${DIFFSTAT:-none}"
FILES_CHANGED="$(git diff --name-only "${LOCAL_REF}...${REMOTE_REF}" 2>/dev/null | wc -l | tr -d ' ')"
emit FILES_CHANGED "${FILES_CHANGED:-0}"

# Whether a merge would conflict (merge-tree shows conflict markers if so).
MERGE_BASE="$(git merge-base "$LOCAL_REF" "$REMOTE_REF" 2>/dev/null)"
if [ -n "$MERGE_BASE" ]; then
  if git merge-tree "$MERGE_BASE" "$LOCAL_REF" "$REMOTE_REF" 2>/dev/null | grep -q '^<<<<<<<'; then
    emit LIKELY_CONFLICTS true
  else
    emit LIKELY_CONFLICTS false
  fi
else
  emit LIKELY_CONFLICTS unknown
fi
