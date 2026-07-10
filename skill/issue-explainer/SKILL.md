---
name: issue-explainer
description: Fetches a GitHub issue from a repository and explains it in simple, plain English. Use this skill whenever the user mentions an issue number, asks about a GitHub issue, wants to understand a bug report or feature request, or says things like "what's issue #42 about?", "explain this issue", "look up issue X in repo Y", or "summarize issue N". Also use when the user pastes a GitHub issue URL and asks for clarification.
---

# Issue Explainer

This skill fetches a GitHub issue and breaks it down in plain, jargon-free English so anyone can understand it — regardless of their technical background.

## When to use this skill

Trigger this skill when the user:
- Mentions a GitHub issue by number (e.g., "what's issue #123 about?")
- Provides a GitHub issue URL and asks about it
- Asks to explain, summarize, or translate a bug report or feature request
- Says something like "look up issue X in the owner/repo repo"
- Asks "what does this issue mean?" or "can you break down this issue?"

The skill is specifically for **GitHub** issues. It does not handle GitLab, Bitbucket, or other platforms.

## Workflow

### Step 1: Identify the issue

Determine the repository and issue number from the user's message. You may need to ask the user for missing information.

**Expected inputs** (the user should provide at least one):
- A full GitHub issue URL: `https://github.com/owner/repo/issues/123`
- An issue number plus a repo: `#123 in owner/repo`
- Just an issue number — in this case, check if the current working directory is a git repo with a GitHub remote and infer the repo from that. If you can't determine the repo, ask the user.

### Step 2: Fetch the issue

Use the `gh` CLI to fetch the issue details:

```bash
gh issue view <NUMBER> --repo <OWNER>/<REPO> --json title,body,labels,author,state,comments,createdAt,closedAt,assignees,milestone
```

If the user provided a URL, you can also use:

```bash
gh issue view <URL> --json title,body,labels,author,state,comments,createdAt,closedAt,assignees,milestone
```

If `gh` is not authenticated or not available, fall back to fetching the issue via the GitHub API:

```bash
curl -s https://api.github.com/repos/<OWNER>/<REPO>/issues/<NUMBER>
```

And for comments:

```bash
curl -s https://api.github.com/repos/<OWNER>/<REPO>/issues/<NUMBER>/comments
```

### Step 3: Explain the issue in plain English

Write a clear, plain-English explanation of the issue. Structure your response as follows:

**Title**: Restate the issue title in simple terms if it contains jargon.

**What's going on**: 2-3 sentences explaining the problem or request in everyday language. Imagine you're explaining it to a coworker who doesn't work on this project.

**First principles — the real need underneath**: Strip away the specific fix or feature the reporter proposed and name the underlying problem they actually have. People often file an issue describing *their* preferred solution ("add a button that does X") when the root need is something more general ("I can't tell when Y finished, so I keep guessing"). State that root need in one or two plain sentences. This matters because the proposed fix isn't always the best one — surfacing the underlying need lets the reader judge the request on its merits and spot simpler or better solutions. If the issue truly is just its literal ask (a typo, a broken link), say so plainly rather than inventing depth.

**Before ➜ After**: Give one concrete, everyday example of how things work *today* versus how they'd work *if this issue were resolved*. Make it specific — a real action someone takes and what they see — not an abstract restatement. This turns the explanation from theory into something the reader can picture. Use this shape:

- **Before (today):** [what someone does now and the friction/bug they hit]
- **After (if resolved):** [the same moment, but working the way the issue wants]

For a bug, "Before" is the broken behavior and "After" is it working correctly. For a feature request, "Before" is the current workaround or gap and "After" is the new capability. Keep each side to a sentence or two.

**Key details**:
- Who reported it and when
- Current status (open/closed)
- Any labels that add context
- Who's assigned (if anyone)
- What milestone it's part of (if any)

**What people are saying**: Briefly summarize the conversation in the comments — don't list every comment, just capture the main points of discussion or any proposed solutions. If there are no comments, say "No discussion yet."

**Why it matters**: One sentence on the impact — who's affected, what breaks, or what opportunity this represents.

## Guidelines for writing the explanation

- Avoid jargon and technical terms when possible. If you must use a technical term (e.g., a specific API name), briefly define it.
- Don't just paraphrase the issue body — truly explain what the problem or request is. The original issue is often written for maintainers; your explanation should be written for everyone.
- Keep it concise — aim for a response that fits comfortably on one screen.
- If the issue body is very long or contains a lot of code/logs, focus on the core problem and mention that there are additional technical details rather than dumping everything.
- Be neutral in tone — describe the problem, don't editorialize about whether it's "critical" or "trivial" unless the labels or comments explicitly say so.
- If the issue is a feature request rather than a bug, frame it as "what the person wants added" rather than "what's broken."