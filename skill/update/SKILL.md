---
name: update
description: >
  Run for "/update" and for any request to update, refresh, sync, fix, maintain,
  or de-stale a repository's CLAUDE.md — the project brief / "agent instructions"
  file a fresh Claude reads to understand a codebase. Use it whenever CLAUDE.md
  has drifted from reality: it's stale or no longer trusted, merged PRs or
  recently shipped features aren't reflected yet, or the user wants recent or
  completed work captured in it. Covers phrasings like "update CLAUDE.md", "bring
  CLAUDE.md up to date", "sync it with what the codebase looks like now", "the
  docs are out of date", "add the recent work to the completed-work section", and
  "record what we did today in claude md". The skill reads the current CLAUDE.md,
  gathers what's new from recent git history and the conversation, keeps only what
  a future Claude actually needs, and edits the doc in place — fixing stale
  sections and logging completed work while preserving its structure and tone.
  Prefer this over hand-editing CLAUDE.md. Do NOT use it to scaffold a CLAUDE.md
  when none exists (that's /init), or to change settings/config/harness files
  (that's update-config).
---

# Update CLAUDE.md

CLAUDE.md is the briefing a *fresh* Claude reads cold at the start of a new
session — no memory of what was built, no access to this conversation. Its whole
job is to keep that future Claude from making worse decisions for lack of
context. So the work here isn't "summarize recent changes." It's: **find the gap
between what the doc claims and what the project has actually become, and close
it** — adding what's missing, correcting what's now wrong, and cutting what no
longer holds.

That framing decides everything below. When unsure whether something belongs,
ask: *would a competent Claude, starting cold, make a worse call without this?*
If yes, it belongs. If it's rediscoverable in thirty seconds by reading one
obvious file, it doesn't.

## Step 1 — Find the CLAUDE.md to update

Default to the **repo-root `CLAUDE.md`** (the project brief checked into git).

- If the user names a path, use that one.
- If there are several (e.g. a root one plus subdirectory ones), update the
  root unless the recent work clearly lives under a subdir that has its own —
  then mention the others and ask which they meant rather than guessing.
- If none exists, don't fabricate one. Say so and point them at `/init`, which
  is the tool built to scaffold a CLAUDE.md from scratch.

Read the whole file before changing anything. You're editing a living document,
not appending to a log — you need its structure, its section names, its tone,
and what it already says (so you don't repeat or contradict it).

## Step 2 — Gather what's new

Two sources, used together:

1. **Recent git history.** Run the bundled helper from the repo root.
   `<skill-dir>` is the folder this SKILL.md lives in — its absolute path is
   given to you when the skill is invoked; if you don't have it, find it with
   `find ~/.claude -path '*update/scripts/gather_context.sh'`:

   ```bash
   bash <skill-dir>/scripts/gather_context.sh CLAUDE.md
   ```

   It prints today's date, the last commit that touched CLAUDE.md, every commit
   since then, and the per-file churn. That commit is your anchor: everything
   after it is work the doc has not yet had a chance to reflect. The churn
   (`diff --stat`) is your map of *where* to look — source files that grew a lot
   or are brand new are where architecture likely shifted. Discount `tests/`
   churn: tests track changes, they don't drive architecture, so a big test diff
   is a weak signal for what to document. Read the actual diffs or files for
   anything structurally significant; commit subjects alone lie by omission.

   Cross-check the anchor against the doc itself: if CLAUDE.md keeps a dated
   "Completed Work"-style log, its newest entry date is a second — and usually
   better — anchor for "what haven't we written down yet." A commit's date can
   lag the content it records, so when the two disagree, trust the doc's date.

2. **The current conversation.** What did *this session* build, decide, or
   discover that isn't committed yet or isn't obvious from the diff? Design
   decisions, new conventions agreed on, gotchas hit — these often never make it
   into a commit message but are exactly what a future Claude needs.

(Uncommitted working-tree changes are out of scope unless the user explicitly
asks to include them; the helper flags when they exist so you can offer. The
common case is an uncommitted diff that merely *refines* a committed change
you're already documenting — there, document the committed behavior and ignore
the in-progress polish.)

## Step 3 — Decide what actually belongs

This is the judgment that makes the skill worth using instead of pasting a
changelog. Pass everything through the "would a cold Claude decide worse without
it?" filter.

**Belongs in CLAUDE.md:**
- New, removed, or renamed subsystems / modules / major files, and shifts in how
  data flows between them.
- New architectural patterns, abstractions, or extension points (e.g. "channels
  are now auto-discovered via entry points").
- New or changed build / test / run / lint commands, and new dependencies or
  external services that change *how you work* in the repo.
- Conventions, code-style rules, and non-obvious constraints or gotchas that
  were established or discovered.
- Project state that isn't derivable from the code: what's done, what's pending,
  decisions and their rationale — especially if the doc maintains a "Completed
  Work" log, which is curated highlights, not an exhaustive history.
- **Corrections.** Anything the doc currently asserts that the recent work made
  false: a moved file path, a renamed command, a subsystem that was replaced.
  Stale instructions are worse than missing ones because they're actively
  trusted.

**Does not belong:**
- Routine bugfixes and internal refactors with no interface or workflow change.
- Anything obvious from a quick read of the one file it concerns.
- Dependency version bumps that don't change how anyone works.
- Session ephemera ("we spent an hour debugging the flaky test").
- A dump of the git log. If you find yourself transcribing commit subjects
  one-to-one, you've stopped curating.

When the recent work genuinely contains nothing that clears the bar, the right
answer is to say so and change nothing. A no-op is a valid, honest outcome —
don't manufacture edits to look busy.

## Step 4 — Reconcile with the existing doc

Make the doc read as if it had always been written this way — not as if someone
bolted a "Recent Changes" box onto the end.

- **Match the existing structure and voice.** If architecture lives in a
  "High-Level Architecture" section, update that section in place. If there's a
  `## Completed Work` section with `### YYYY-MM-DD — title` entries, add a new
  entry in exactly that shape. Reuse the doc's own headings, bullet style, and
  level of detail.
- **Prefer editing over appending.** Tightening or correcting an existing line
  usually beats adding a new one. The goal is a doc that stays lean and
  high-signal; every line should still earn its place.
- **Remove what's now wrong** rather than leaving it to rot beside the
  correction.
- **Use absolute dates** (today's date comes from the helper). Convert any
  "recently" / "now" / "last week" into a real date so it still makes sense
  months later.
- Only introduce a new top-level section if the new material genuinely has
  nowhere to live — and then name it in the doc's established style.

## Step 5 — Summarize, confirm, then edit

Before touching the file, show the user a short, scannable plan grouped by intent
— so they see your reasoning, not just a diff after the fact:

```
Planned CLAUDE.md updates:
  Add:    <new fact> → <which section>
  Fix:    <stale claim> → <correction>
  Remove: <obsolete line> (no longer true: <why>)
```

Keep it to the things that cleared the bar in Step 3, each tied to its section.

**Then ask before editing — this is a gate.** The plan is a proposal, not a done
deal. CLAUDE.md is the briefing every future session trusts, so the user — not
you — should decide whether these specific changes land in it. Ask with the
**AskUserQuestion** tool: a single go/no-go on the whole plan (not per-item
nitpicking), e.g. "Apply these CLAUDE.md updates?" with options like:

- **Apply them** — make all the planned edits.
- **Adjust first** — they tell you what to change; revise the plan and re-ask.
- **Don't edit** — leave CLAUDE.md untouched (the plan still stands as a summary
  they can act on later).

Only edit the file once they choose to apply. If they pick "adjust," revise and
re-present rather than proceeding on a maybe. When you do edit, apply all the
approved changes in one pass. Do NOT commit; leave the change in the working tree
(uncommitted) for them to inspect — committing is the `gitpush` skill's job, on
request.

**No human to ask?** If you're running non-interactively (e.g. as a subagent
with no one present to answer), you can't gate on a question — write the same
plan into your output instead of presenting it live, then proceed with the edits,
so the work isn't blocked on an answer that will never come.

Close by telling them what you changed in one or two lines, and call out
anything you deliberately left out and why (e.g. "skipped the 6 bugfix commits —
no workflow impact"), so the omissions are a visible choice rather than a silent
gap.

## Principles

- **The reader is a stranger with your codebase and none of your memory.** Write
  for them.
- **Accuracy over completeness.** A short, true CLAUDE.md beats a long one with
  three stale claims a future Claude will trust and act on.
- **Curate, don't transcribe.** The value you add is judgment about what
  matters — not coverage.
- **Leave it lean.** If the doc is getting bloated, tightening counts as a real
  improvement; you're allowed to cut.
