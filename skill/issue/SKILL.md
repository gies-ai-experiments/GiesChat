---
name: issue
description: Analyzes a GitHub issue from first principles and grounds it in THIS codebase — what the real problem is at root (explained in plain, zero-jargon language a total newcomer can follow), what the correct behavior should be (with concrete examples), where in the code the fix belongs, how much of the codebase a fix would touch (blast radius), and a brainstorm of approaches with tradeoffs. Use this whenever the user wants to dig into an issue rather than just summarize it: "/issue", "/issue 42", "analyze issue 128", "what's really going on with issue #7", "where would I fix this issue", "how big a change is issue 19", "brainstorm a fix for the latest issue", "first-principles on issue X", or just "issue" with no number (then take the latest open issue). If the user gives no number, default to the most recent open issue in the current repo. This is deeper than the issue-explainer skill (which only paraphrases in plain English) and different from code-review (which hunts bugs in a diff) — reach for THIS skill when the goal is to understand a problem deeply and scope a fix, not to write the fix.
---

# Issue Analyzer

This skill takes a GitHub issue and does the thinking a senior engineer does *before* opening their editor: it reasons from first principles about what's actually broken (or wanted), works out what the correct behavior should be, locates where in **this** codebase the fix belongs, estimates how far the change ripples, and brainstorms ways to do it.

The point is to turn a one-paragraph issue into a real plan-of-attack. The reader should come away knowing the root cause, the files they'll touch, roughly how big a job it is, and what their options are — without having gone digging themselves.

**What this skill is not:**
- It is **not the `issue-explainer` skill** — that one only paraphrases what the issue says. This one digs into the actual code to find the real mechanism — though its explanation is still written in plain language anyone can follow (the difference is depth and code-grounding, not vocabulary).
- It is **not `code-review`** — that hunts for bugs in a diff. This works from an issue toward a scoped solution.
- It does **not implement the fix.** It stops at "here's what I'd do and why." Writing the code is a separate, deliberate step the user asks for explicitly. (If they do, hand off to your normal implementation flow — ideally brainstorming/TDD.)

## When to use this skill

Trigger when the user wants to *understand and scope* an issue:
- Invokes it directly: `/issue`, `/issue 42`
- "Analyze issue 128", "dig into issue #7", "what's really going on with issue X"
- "Where would I fix this?", "how big a change is this issue?", "what does this touch?"
- "Brainstorm a fix for issue 19" / "how should we approach this?"
- Mentions "the latest issue" or gives no number at all — then take the most recent open issue.

This is **GitHub-only.** It does not handle GitLab, Bitbucket, or others.

## Workflow

### Step 1: Identify the issue

Figure out the repository and issue number.

- **Repo:** infer from the current directory's GitHub remote (`git remote get-url origin`, or whatever remote points at github.com). If the directory isn't a GitHub repo, ask the user which repo.
- **Issue number:**
  - If the user gave a number or a URL, use it.
  - **If they gave no number, default to the most recent open issue:**
    ```bash
    gh issue list --limit 1 --state open --json number,title
    ```
    If there are no open issues, fall back to the most recent issue of any state (`--state all`). Tell the user which issue you picked and why ("no number given — taking the latest open issue, #54") so they can redirect you if that's not the one they meant.

### Step 2: Fetch the issue

Get the full issue including the discussion — the comments often contain the real diagnosis, a repro, or a half-agreed-on plan that should shape your analysis.

```bash
gh issue view <NUMBER> --json number,title,body,labels,author,state,comments,createdAt,closedAt,assignees,milestone,url
```

Also check whether anything is already linked — a closed issue may have been fixed by a PR, and an open one may have a draft attempt:

```bash
gh issue view <NUMBER> --json number,title,state --comments   # surfaces cross-references / "Closed by #NNN"
```

If `gh` isn't installed or isn't authenticated (`gh auth status` errors), fall back to the REST API. Note that private repos need a token in the header:

```bash
curl -s https://api.github.com/repos/<OWNER>/<REPO>/issues/<NUMBER>
curl -s https://api.github.com/repos/<OWNER>/<REPO>/issues/<NUMBER>/comments
# private repo: add  -H "Authorization: Bearer $GITHUB_TOKEN"
```

If you genuinely can't fetch it (no auth, private repo, no token), stop and tell the user plainly rather than analyzing from the title alone — say what you need (e.g. "run `gh auth login` and I'll re-run this"). A confident analysis built on a guess about the issue's contents is worse than asking.

### Step 3: Reason from first principles — what is the issue, really?

This is the part that makes the skill worth running. Don't restate the title. Work out the **mechanism** — and then **explain it like the reader knows nothing**.

Write this explanation for someone with zero context: no assumed familiarity with the codebase, the framework, or the jargon in the issue thread. Build it up from first principles the way you'd explain to a smart friend from a different field — start from what the software is trying to do, then show step by step where and why reality diverges. Every technical term you can't avoid gets a one-clause definition in place ("the cache — a saved copy the app checks before asking the server"). Prefer everyday analogies when they genuinely map. The test: someone who has never seen this repo should finish the section understanding *what goes wrong and why*, not just believing you.

This does not mean dumbing down the *analysis* — the mechanism must still be exact and code-grounded. It means the *writing* carries no prerequisite knowledge:

- For a **bug**: what is the code actually doing, and why does that produce the reported symptom? Trace it to a cause — a wrong assumption, a missing case, a race, a bad default, an API contract mismatch. "The button does nothing" is a symptom; "the handler is registered before the element mounts, so the listener attaches to nothing" is a cause.
- For a **feature request**: what's the underlying need behind the ask? Users often request a solution; name the actual problem. (Someone asking for "a bigger export button" may really be saying "I can't find how to export.")
- Separate what the issue *claims* from what's *true*. Issue reporters guess at causes and are often wrong. Read the relevant code before you accept their diagnosis.

You will usually need to **open the code** to do this honestly. Search the repo for the symbols, error strings, screens, or routes the issue mentions, and read enough to confirm the mechanism. An analysis that never touched the code is a guess.

### Step 4: What is it supposed to do? (with a concrete example)

State the correct behavior — the spec the fix should satisfy. Make it concrete with a small example, ideally a before/after the reader can picture:

> **Now:** Maria types "café" in search and gets zero results, because the index is compared with `==` against the un-normalized query.
> **Should:** "café", "cafe", and "CAFÉ" all return the café entry — search should normalize accents and case before comparing.

If the right behavior is genuinely ambiguous (the issue underspecifies it), say so and lay out the reasonable interpretations rather than silently picking one — that ambiguity is itself something the user needs to resolve before coding.

### Step 5: Where it lives in the code

Point at the actual place(s) a fix would go. Use the search/read tools to find them — don't hand-wave.

- Name specific files and, where you can, functions or line ranges (`src/search/index.ts:84` — the comparison in `matchEntry()`).
- If the issue is **already closed**, find what fixed it instead — the linked PR or the commit that closed it — and point at *that* change, so the user can see how and where it was resolved.
- If you can't locate the relevant code with reasonable confidence, say where you looked and what you'd need to narrow it down, rather than inventing a path.

### Step 6: Blast radius — how much will a fix touch?

Estimate the scope honestly. This is what tells the user whether it's a ten-minute change or a refactor. Consider:

- **Spread:** roughly how many files/modules, and are they in one layer or across many (UI + API + DB + tests)?
- **Ripple:** does the change alter a shared function, a public type, an API shape, a stored format, or a migration? Those reach far beyond the obvious file. A one-line change to a widely-imported helper is a *bigger* blast radius than a fifty-line change to one isolated screen.
- **Risk:** what could it break? What's the worst-case if it's done wrong (data loss, auth, money) versus a contained cosmetic glitch?
- **Effort:** give a rough t-shirt size (S / M / L) with one line of reasoning, not a fake hour estimate.

### Step 7: Brainstorm approaches

Offer **2–4 genuinely different ways** to fix it, not one plan dressed three ways. For each: a one-line description, its main tradeoff (effort vs. correctness vs. risk vs. blast radius), and when you'd pick it. Then give a recommendation with a reason — usually the one that solves the *root cause* (Step 3) at acceptable cost, not the quickest patch over the symptom. If the discussion in the issue already converged on an approach, weigh it honestly rather than ignoring it.

## Report structure

Use this template. Keep each section tight — this is a scoping document, not an essay.

```
# Issue #<N>: <title>   ·   <state>  ·  <labels>

## The issue, from first principles
<root-cause / underlying-need reasoning — the mechanism, not a restatement.
Written in plain language for a reader with zero context: no unexplained
jargon, terms defined in place, built up step by step from what the software
is supposed to do>

## What it's supposed to do
<correct behavior, with a concrete before/after example>

## Where it lives in the code
<specific files / functions / lines — or, if closed, the change that fixed it>

## Blast radius
<spread · ripple · risk · effort (S/M/L) — how much of the codebase a fix touches>

## Approaches
1. <approach> — <tradeoff>; pick when <...>
2. <approach> — <tradeoff>; pick when <...>
**Recommended:** <which, and why>
```

End with a one-line offer to go deeper or start implementing — but don't start writing code unless the user says so.

## Guidelines

- **Explain like the reader knows nothing; analyze like an expert.** The first-principles section assumes zero prior context — plain words, jargon defined in place, step-by-step buildup. Why: the person triaging an issue often isn't the person who wrote that code (a new contributor, a PM, a student), and an explanation that leans on insider vocabulary just moves the confusion around. Precision and simplicity are not in tension — cite the exact file and line, then say what it does in words a newcomer follows.
- **Ground every claim in the actual code or the issue text.** The value here is grounding, not speculation. If you assert where the fix goes or how far it ripples, it should trace to something you read. When you're inferring rather than confirming, say so.
- **Find the root cause, not the symptom.** The reporter's described fix is a starting hypothesis, not the answer. The most useful thing this skill does is catch "the real problem is one layer down from where everyone's looking."
- **Be honest about size and risk.** Don't undersell a refactor as a quick fix, or inflate a trivial change. The user is deciding whether/when to take this on based on your blast-radius read.
- **Scope, don't solve.** Stop at the plan. Writing the fix is a separate decision the user makes explicitly — when they do, move into your normal implementation workflow (brainstorm the design, then TDD).
- **Match framing to type.** A bug is "what's broken and why"; a feature is "what's actually needed and what it would touch"; a closed issue is "what the problem was and how it got resolved."
