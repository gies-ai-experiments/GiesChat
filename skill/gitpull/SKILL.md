---
name: gitpull
description: This skill should be used when the user asks to "gitpull", "pull a branch", "pull from origin", "pull the latest", "update my branch from remote", or otherwise wants to merge a remote branch into their local one. It uses the branch the user named (or asks a prehook question when none is given), compares the incoming remote changes against the local branch, and warns the user before merging when the two have diverged massively.
version: 0.1.0
---

# gitpull

Pull a remote branch into the local working branch safely. Use the branch the
user named; if none was given, ask. Before merging, compare the incoming remote
changes against the local branch and **alert the user when the divergence is
large** (many commits behind, not fast-forwardable, large diff, or likely
conflicts) so they can decide before history is merged.

## Workflow

Run these steps in order. Do not merge until the user has seen the comparison.

### Step 1 — Determine the branch

Use the branch the user explicitly mentioned in their request. If they did not
name one, ask the prehook question with the **AskUserQuestion** tool: which
branch to pull, defaulting to the current branch and offering the local
branches as options. (Run preflight first — Step 2 — to populate the list.)

### Step 2 — Preflight (gather state + divergence)

Run the preflight script, passing the chosen branch, and parse the
`KEY=VALUE` output:

```bash
bash "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/skills/gitpull}/scripts/preflight.sh" "<branch>"
```

It reports: `IS_GIT_REPO`, `CURRENT_BRANCH`, `LOCAL_BRANCHES`, `HAS_ORIGIN`,
`ORIGIN_URL`, `TARGET_BRANCH`, `WORKTREE_DIRTY`, `UNCOMMITTED_COUNT`,
`FETCH_OK`, `REMOTE_BRANCH_EXISTS`, `LOCAL_BRANCH_EXISTS`, `LOCAL_REF`,
`BEHIND` (incoming commits on origin not local), `AHEAD` (local commits not on
origin), `FAST_FORWARD`, `INCOMING_DIFFSTAT`, `FILES_CHANGED`, and
`LIKELY_CONFLICTS`. The script only does a read-only `git fetch` — it never
merges or resets. Base all decisions on these values.

Stop and tell the user if any of these fail:
- `IS_GIT_REPO=false` → not a git repo.
- `HAS_ORIGIN=false` → no `origin` remote configured.
- `FETCH_OK=false` → remote unreachable; resolve connectivity first.
- `REMOTE_BRANCH_EXISTS=false` → `origin/<branch>` does not exist; re-confirm
  the branch name.

If `WORKTREE_DIRTY=true`, there are uncommitted changes that a merge could
disrupt. Ask whether to commit or stash them before continuing.

### Step 3 — Compare and warn on large divergence

Compare the incoming remote changes against the local branch and report:
`BEHIND`/`AHEAD`, `FAST_FORWARD`, `INCOMING_DIFFSTAT`, `FILES_CHANGED`, and
`LIKELY_CONFLICTS`. Show the incoming commit log for context:

```bash
git log --oneline --graph "<LOCAL_REF>..origin/<branch>"
```

Treat the pull as a **massive divergence** and explicitly alert the user before
merging when any of these hold:
- `FAST_FORWARD=false` **and** `AHEAD>0` — histories have truly diverged; a
  merge will create a merge commit and may conflict.
- `BEHIND` is large (roughly >= 30 commits) or `FILES_CHANGED` is large
  (roughly >= 50 files), or `INCOMING_DIFFSTAT` shows a very large change.
- `LIKELY_CONFLICTS=true` — the merge is expected to produce conflicts.

When the divergence is massive, **pause and ask the user how to proceed** with
**AskUserQuestion** before merging. Lay out the trade-offs of the realistic
options, for example:
- **Merge** `git merge origin/<branch>` — keeps both histories; may need
  conflict resolution.
- **Rebase** `git rebase origin/<branch>` — replays local commits on top of
  remote for a linear history; may need conflict resolution.
- **Review first** — open the diff/log before deciding.
- **Abort** — make no changes.

If the divergence is small or it is a clean fast-forward, summarize briefly and
proceed without the heavy warning.

### Step 4 — Merge

After the user has seen the comparison (and chosen, when prompted):

- Clean fast-forward (`FAST_FORWARD=true`): `git merge --ff-only origin/<branch>`
  — or simply `git pull` when pulling the current branch's own upstream.
- Diverged, user chose merge: `git merge origin/<branch>`.
- Diverged, user chose rebase: `git rebase origin/<branch>`.

If conflicts arise, stop and walk the user through resolving them; do not force
the merge through. Never `git reset --hard` or discard local commits to "make
it pull" without explicit confirmation.

Report the result: commits merged in, the new HEAD, and any files left in
conflict.

## Notes

- Re-run the preflight script after switching branches, committing, or stashing
  so the divergence numbers stay accurate.
- The thresholds above are heuristics — when a value is close to the line,
  prefer showing the comparison and letting the user decide.
