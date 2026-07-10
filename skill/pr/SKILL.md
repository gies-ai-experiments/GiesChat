---
name: pr
description: Fetches a GitHub pull request and explains, in plain English, what it's trying to accomplish and how the application will behave differently once it's merged — including a concrete before/after example. Use this skill whenever the user mentions a pull request by number, pastes a PR URL, or asks things like "what does this PR do?", "explain PR #42", "what's this pull request changing?", "summarize this PR", "what will change if we merge this?", or "break down the PR in owner/repo". The PR number (and optionally the repo) can be passed directly in the invocation — e.g. `/pr 42` or `/pr 42 owner/repo` — and the skill uses it without asking again. Also use when the user references "the PR", "this pull request", or "my PR" and wants to understand its intent or impact rather than hunt for bugs. **Also handles PR review comments:** whenever the user asks to look at, read, explain, summarize, or respond to the comment(s) or review on a specific PR — e.g. "look at the comment on PR 32", "what did the reviewer say", "explain the PR comments", "what does Copilot/codex want changed", "go through the review feedback on #18" — use this skill to restate what the PR is, lay out each comment with a concrete before/after code example, and judge each comment's validity and severity (blocking bug, security, a11y, minor nit, etc.). The skill can additionally **merge the PR locally and push to origin `main`** when the user explicitly asks to merge / land / ship it — first checking that local `main` is in sync with origin and that the PR merges without conflict. This is an explainer, a review-comment analyzer, and (on request) a merger — not a fresh bug hunt: to generate NEW correctness/security findings on the diff, use the code-review skill instead (triaging EXISTING review comments is this skill's job).
---

# PR Explainer

This skill fetches a GitHub pull request and explains it in plain, jargon-free English: **why** it exists (the intention) and **what will actually change in the application** when it ships — grounded in a concrete before/after example so anyone can picture the difference.

The reader might be a designer, a PM, a founder, or the engineer who wrote it coming back six months later. None of them should need to read the diff themselves to understand what this PR means for the product.

## When to use this skill

Trigger this skill when the user:
- Mentions a PR by number ("what's PR #128 doing?") or pastes a PR URL
- Asks to explain, summarize, or "break down" a pull request
- Asks "what will change if we merge this?" or "what does this PR affect?"
- References "the PR" / "this pull request" and wants to understand its purpose or impact
- Asks to look at, read, explain, or go through the **comment(s) or review** on a PR ("what did the reviewer say on #32?", "explain the Copilot comments", "is that review comment valid?") — see **Reviewing PR comments** below
- Wants to understand or act on **review feedback**, whether left by a human teammate or an automated reviewer bot (GitHub Copilot, codex, etc.)

**This is GitHub-only.** It does not handle GitLab, Bitbucket, or others.

**This is not a fresh bug hunt.** Two related-but-distinct jobs: *explaining a PR's intent/impact* and *triaging the review comments already left on it* are both this skill. *Generating new* correctness/security/quality findings on the diff is the `code-review` skill — point the user there for that. (And once they decide to act on review feedback, implementing it well is the `receiving-code-review` skill — verify suggestions, don't blindly apply.)

## Workflow

### Step 1: Identify the PR

Figure out the repository and PR number from the user's message. The PR can be specified directly in the invocation arguments (e.g. `/pr 42`, `/pr 42 owner/repo`, or `/pr https://github.com/owner/repo/pull/42`) — when an argument is present, use it directly instead of asking the user to repeat it. Accept any of:
- A full PR URL: `https://github.com/owner/repo/pull/128`
- A number plus repo: `#128 in owner/repo` or `42 owner/repo`
- Just a number (`42`, `#42`, or passed as the skill argument) — infer the repo from the current directory's GitHub remote (`git remote get-url origin`). If you can't determine the repo, ask the user rather than guessing.

If the invocation arguments already contain a number or URL, treat that as the PR to explain — don't ask "which PR?" when it was handed to you in the query.

### Step 2: Fetch the PR and its diff

You need both the metadata (what the author *said*) and the diff (what the code *does*). Read both — the description tells you the stated intent, the diff tells you the real impact, and they don't always match.

```bash
gh pr view <NUMBER> --repo <OWNER>/<REPO> --json title,body,author,state,isDraft,headRefName,baseRefName,files,additions,deletions,commits,labels,comments,reviews,mergedAt,createdAt,url,mergeable,mergeStateStatus
```

```bash
gh pr diff <NUMBER> --repo <OWNER>/<REPO>
```

**Determining merge status.** Readers want to know whether this PR can be merged cleanly or will hit a conflict. The mergeability fields tell you:
- `gh`: `mergeable` is `MERGEABLE` (no conflicts), `CONFLICTING` (would conflict), or `UNKNOWN`.
- REST API: `mergeable` is `true` / `false` / `null`, and `mergeable_state` adds nuance (`clean`, `dirty` = conflicts, `behind`, `blocked`, `unstable`, `unknown`).

GitHub computes this **asynchronously**, so the first fetch right after a PR is opened often returns `UNKNOWN` / `null`. If you get that, wait a couple of seconds and re-fetch once. If it's still unknown, say so honestly rather than guessing — don't claim "merges cleanly" when GitHub hasn't confirmed it. (A PR that's already merged or closed has no live mergeability; just report its final state.)

If the diff is very large, don't try to absorb every line. Use the file list from the metadata to find the files that carry the *behavior* (screens, components, API handlers, business logic, migrations) and read those closely; skim generated files, lockfiles, snapshots, and pure formatting churn.

If `gh` isn't available or authenticated, fall back to the API:
```bash
curl -s https://api.github.com/repos/<OWNER>/<REPO>/pulls/<NUMBER>
curl -s -H "Accept: application/vnd.github.v3.diff" https://api.github.com/repos/<OWNER>/<REPO>/pulls/<NUMBER>
```

### Step 3: Understand before you explain

Before writing anything, work out for yourself:

1. **What problem is this solving?** Read the title, body, and linked issues. If the description is thin or empty, infer the intent from the diff — what did they have to change, and what would motivate that?
2. **What does the app do differently now?** This is the heart of it. Translate code changes into user-visible or system behavior. A new prop, a changed query, an added column — none of that matters to the reader until you say what it *does*: a button that now works offline, a list that loads faster, an email that sends from a new address.
3. **Who notices?** End users? Admins? Only other developers (e.g. a pure refactor)? Be honest when a change is purely internal and has no user-facing effect — that's a valid and useful answer.
4. **What's a realistic before/after?** Find one concrete scenario the change affects and trace it both ways.

### Step 4: Write the explanation

Use this structure:

**Title** — Restate the PR title in plain terms if it's jargon-y or terse.

**The intention (why this exists)** — 2-3 sentences on the problem or goal in everyday language, as if explaining to a coworker who doesn't work on this project. If the stated description and the actual diff disagree, say so plainly.

**What changes in the app** — The core section. Plain-English bullets describing how the application behaves differently once merged. Each bullet is an *effect*, not a file name. Prefer "Users can now reset their password from the login screen" over "Modified LoginScreen.tsx and added resetPassword()." Group related changes. If the change is purely internal with no user-facing effect, say that directly and describe the developer-facing change instead (e.g., "code that used to call X now calls Y").

**Example — before & after** — One concrete scenario showing the difference, framed as a user story:

> **Before:** Maria opens the app on the subway with no signal and taps "Save word." Nothing happens and the word is lost.
> **After:** The word is queued locally and a "Saved — will sync" note appears; it uploads automatically when she's back online.

Ground the example in the *actual* change — don't invent behavior the diff doesn't support. If the PR is purely internal (a refactor, a dependency bump, a test-only change), say there's no user-visible difference and give a short technical before/after instead (how the code was called or structured before vs. after).

**Key details** — A few quick facts: author, status (open / draft / merged), source → target branch, rough size (files changed, +/- lines), and any labels that add context. **Always include a merge-status line** stating whether the PR merges cleanly or would hit a conflict — e.g. "Merges cleanly into `main`" / "⚠️ Has conflicts with `main` — needs a rebase before merging" / "Mergeability still being computed by GitHub." This is one of the first things a reviewer wants to know. Keep the whole list tight.

**Worth knowing** *(only if it applies)* — Brief, neutral flags a reader should be aware of: a database migration, a breaking change, a new environment variable or secret, a feature flag, or anything that needs a follow-up step to take effect. Skip this section entirely if there's nothing notable. This is not a bug hunt — just the "you should know this exists" items.

## Merging the PR (only on explicit request)

Explaining is the default. **Merging is a separate, deliberate action** that rewrites the shared `main` branch and pushes to origin — it's outward-facing and hard to undo. Only do it when the user clearly asks to merge / land / ship the PR ("go ahead and merge it", "merge this into main"). When they do, follow these steps in order and **never skip the sync check** — that's the guardrail that stops you pushing a stale or clobbered history.

### Step M1: Reconcile local `main` with origin `main` FIRST (hard prerequisite)

A PR must land on top of an up-to-date `main`. If local and origin `main` have drifted apart, merging on top of that drift can clobber commits or push a stale history — so resolve any difference *before* touching the PR.

```bash
git fetch origin
git switch main
git rev-list --left-right --count origin/main...main   # prints "<behind> <ahead>"
```

Interpret the two counts (commits on origin not in local / commits in local not on origin):
- **`0  0`** → in sync. Proceed to M2.
- **`N  0`** (behind only) → local `main` trails origin. Bring it current with the **gitpull** skill (the user's global rule is: never raw `git pull`). Re-check until it reads `0 0`.
- **`0  N`** (ahead only) → local has commits origin doesn't. Unusual for `main`; surface it and let the user decide — they likely want those pushed first via the **gitpush** skill. Don't merge on top of an unpushed divergence silently.
- **`N  M`** (diverged) → **STOP.** The two have different commits. Explain the divergence and let the user reconcile it (rebase/merge); do not force anything.

Only continue once local `main` equals origin `main`.

### Step M2: Merge the PR branch locally

Fetch the PR's head branch (the `headRefName` from Step 2) and merge it into `main`:

```bash
git fetch origin <headRefName>
git merge --no-ff origin/<headRefName>
```

The GitHub `mergeable_state` you already fetched predicts the outcome: `clean` should merge without conflict; `dirty` means expect conflicts.

- **Clean merge** → continue to M3.
- **Conflicts** → **STOP.** Do not auto-resolve conflicts you don't understand — a botched resolution that reaches `main` is worse than not merging. Report which files conflict and let the user resolve them, or run `git merge --abort` to back out cleanly.

### Step M3: Push to origin `main`

Push the merge with the **gitpush** skill (the user's global rule is: never raw `git push`). Then report: the merge commit, the commit range pushed, and that the PR is now landed on origin `main`. GitHub auto-closes the PR once its commits reach the base branch, and this will trigger the repo's `main` CI/CD if configured — mention that if relevant.

## Reviewing PR comments (comments-review mode)

When the user asks to look at the **comments or review** on a PR — rather than (or on top of) explaining what the PR does — the job shifts from "what does this change" to "what is the feedback, and is it worth acting on." Reviewers leave notes ranging from genuine blocking bugs to trivial style nits, and increasingly the reviewer is an automated bot (GitHub Copilot, codex) that phrases a nitpick and a real defect in the same confident tone. The reader wants to know, fast, which is which and what each comment actually means — without opening every thread on GitHub themselves.

### Step C1: Identify the PR
Same as Step 1 — get the repo and PR number from the message or the invocation arguments. Don't re-ask when a number/URL was handed to you.

### Step C2: Fetch every comment surface
GitHub scatters PR feedback across three places; pull all three so nothing is missed, and record **who** authored each — a human teammate vs. an automated reviewer like `Copilot` / `copilot-pull-request-reviewer[bot]` or `codex`. Bots tend to over-flag, so their findings deserve the same scrutiny as anyone's, not automatic deference.

```bash
# 1. Inline code-line comments (the most common kind)
gh api repos/<OWNER>/<REPO>/pulls/<NUMBER>/comments \
  --jq '.[] | "── @\(.user.login) on \(.path):\(.line // .original_line)\n\(.body)\n"'

# 2. Top-level conversation comments (not attached to a line)
gh api repos/<OWNER>/<REPO>/issues/<NUMBER>/comments \
  --jq '.[] | "── @\(.user.login)\n\(.body)\n"'

# 3. Formal reviews (APPROVED / CHANGES_REQUESTED / COMMENTED) + their summary text
gh api repos/<OWNER>/<REPO>/pulls/<NUMBER>/reviews \
  --jq '.[] | "── @\(.user.login) [\(.state)]\n\(.body)\n"'
```

Then fetch the code each inline comment points at — `gh pr diff <NUMBER>` or read the cited `path:line` directly. A comment is meaningless without the code it refers to, and the comment's own description of that code can be wrong.

### Step C3: Understand each comment before you judge it
For every comment, work out for yourself: what is the reviewer actually claiming? Is it *true* against the real code — read the cited lines, don't take the comment's word for it? How bad is it if left unfixed? This independent check is the whole value of the mode: separating the real issues from the noise so the user doesn't have to.

### Step C4: Write the comment review
Lead with a one- or two-line **restatement of what the PR is** (so the reader has context without scrolling up), then name who/what reviewed it and the overall verdict — e.g. "GitHub Copilot's bot left a COMMENTED review (non-blocking) with 3 inline notes." Then take each comment in turn using this shape:

**[short title] — `path:line`** *(author — human or bot)*
- **The comment:** what the reviewer said, in plain English (quote the key phrase if it helps).
- **Before / after:** the actual current code, and the change the comment implies — concrete snippets, not an abstract description.
- **Verdict:** whether it's valid, and how severe — pick the fitting label from *blocking bug · security · correctness · performance · accessibility (a11y) · minor nit · style/preference · already-handled · invalid/wrong*. State plainly whether it's worth doing and why.

Ground the before/after in the real diff, like this:

> **Unbounded search cost — `lib/web-search.ts:5`** *(GitHub Copilot — bot)*
> **The comment:** the search prompt sets no cap on hosted searches, so one query can fan out into many calls.
> **Before:** `...find current, relevant information. Return clean markdown...`
> **After:** `...find current, relevant information. Hard cap: at most 3 web_search calls per query. Return clean markdown...`
> **Verdict:** Valid, and the highest-value note here — it bounds real cost/latency. Worth doing (one sentence in the prompt). *minor-but-real.*

### Step C5: Bottom line + offer
Close with a one-line **bottom line**: how many comments, how many are real vs. noise, and whether any *block* the merge — a `CHANGES_REQUESTED` review does; a `COMMENTED` one (including most bot reviews) does not. Then **offer to apply the fixes**, but don't start editing until the user says yes. If they accept, implementing review feedback is its own discipline — hand off to the `receiving-code-review` skill (verify each suggestion rather than applying it blindly) and make the changes on the PR's head branch.

Keep the explainer's spirit throughout: ground every claim in the actual code, stay neutral, and neither inflate a nit into a crisis nor wave off a real bug as cosmetic.

## Guidelines

- **Explain effects, not edits.** The reader can see the file list on GitHub; what they can't see is what it *means*. Your value is the translation from code to consequence.
- **Stay grounded in the diff.** Every claim about behavior should trace back to an actual change. When the author's description claims something the diff doesn't show (or vice versa), trust the diff and note the gap.
- **Keep it to one screen.** Aim for something the reader can absorb in under a minute. Long diffs get summarized, not transcribed — if there's deep technical detail, gesture at it ("plus the usual test and type updates") rather than listing everything.
- **Plain English.** Avoid jargon; when a technical term is unavoidable (a specific API or service name), define it in a few words.
- **Be neutral.** Describe what the PR does and who it affects. Don't editorialize about whether it's good, risky, or trivial unless the labels, reviews, or description say so.
- **Match the framing to the PR.** A feature is "what users can now do"; a bugfix is "what used to break and now doesn't"; a refactor is "what's cleaner under the hood, with no change users will notice."
