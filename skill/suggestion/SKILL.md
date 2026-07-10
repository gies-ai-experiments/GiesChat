---
name: suggestion
description: "Use when someone brings a feature request, suggestion, or product idea for an app or piece of software and wants it explained, sized up, or scoped — e.g. 'here's a feature request, what do you think', 'is this feasible?', 'what would this take?', 'a user asked for X, can we do it', 'explain this suggestion', or they just paste/describe an idea or point at an issue. Explains the request in plain English, judges whether it's feasible for THIS codebase (by actually looking at the code), and shows a concrete before/after of how the app would behave. Trigger this whenever a feature idea needs evaluating, even if the user never says the word 'suggestion'."
---

# Explain & Assess a Feature Suggestion

You help someone make sense of a feature request *before* any code gets written.
Three things, in plain language: what the request actually is, whether it's
realistic for **this** codebase, and what concretely changes for the user.

The whole value here is **grounding**. Anyone can say "sure, sounds doable" in
the abstract. What makes your answer worth anything is that you actually look at
the code — so "feasible" means you found the place it would slot into, and "hard"
means you saw the specific thing standing in the way.

## When to use this

Someone brings you a feature idea, request, or suggestion for an app or piece of
software and wants it explained, sized up, or scoped — their own idea, a request
forwarded from a customer, or a line in a backlog. They might paste it, describe
it, or point you at an issue. They might ask "is this doable?", "what would this
take?", "explain this request", or just drop the idea and wait. You don't need
the word "suggestion" to be said.

## Step 1 — Say what's being asked, plainly

Restate the request in one to three sentences of plain English, stripped of
jargon. The test: the requester (who may not be technical) reads it back and
thinks "yes, that's exactly it."

Separate **what** they're asking for from **why** they want it. The underlying
need is often satisfiable a simpler way than the literal ask, and naming it opens
that door. If you genuinely can't tell what the request touches — which screen,
which data, which behavior — ask one focused question and stop. Don't assess a
request you don't actually understand yet.

## Step 2 — Ground it in the actual codebase

This is the step that makes your verdict trustworthy. Before judging anything,
find out how the relevant part of the app works *today*:

- **Locate where the feature would live** — the module, screen, route, or data
  model it touches. Search for the nearest existing feature; the closest analog
  tells you most of what you need to know.
- **Check whether the building blocks already exist.** "Add X" is easy when the
  app already has the machinery for X and hard when it doesn't. Does it already
  have auth? a job queue? a notifications path? the data this would need?
- **Notice the constraints** — the stack, the architectural patterns, anything
  that makes this naturally easy or genuinely awkward to bolt on.

If you can't reach the codebase (no repo in context, or it's out of scope), say
so plainly and give a best-estimate verdict clearly labeled as such. Don't
manufacture certainty you don't have — a labeled estimate is honest; a confident
guess dressed up as fact is not.

## Step 3 — Judge feasibility for this project

Give one clear verdict, then back it with what you found in Step 2:

- **Feasible** — fits how the app is already built; a routine change.
- **Feasible, with effort** — doable, but it touches several areas, needs a new
  dependency, a schema change, or some rework.
- **Hard** — possible but costly or risky; name the specific obstacle.
- **Not feasible right now** — blocked on a prerequisite, a platform limit, or a
  conflict with the current design; say what would have to change first.

Add a rough **size** (a small tweak, a few files, a large piece of work) and flag
any real **blockers or prerequisites**. Be honest in both directions: don't sell
a deep change as trivial, and don't wave off a good idea you never actually
looked into. Someone can plan around an honest "hard"; they can't plan around a
cheerful "sure" that falls apart in week two.

## Step 4 — Show a concrete before / after

Make the difference real with one user-visible example. Pick a realistic
scenario and show how it goes today versus how it would go with the feature:

```
Before: <what a user sees or has to do today>
After:  <what they'd see or do once this ships>
```

Keep both sides specific to how the app *really* behaves. A concrete before/after
is what turns an abstract request into something everyone can picture — and
decide on.

## Putting it together

A good reply is short and scannable, roughly this shape:

```
What you're asking for: <plain restatement>

Feasibility: <verdict> — <why, citing the part of the code you looked at>
Size: <small / a few files / large>    Blockers: <any, or "none">

Before: <current behavior>
After:  <behavior with the feature>
```

Cite what you actually looked at (a file, a module, an existing feature) so the
verdict is traceable rather than a vibe. Don't invent behavior or code you didn't
see. And keep the focus on helping the person *decide* — this skill explains and
scopes a request; it doesn't implement it unless they ask you to as a next step.

## Example

**Input:** "Someone on the team wants the app to email users a weekly summary of
their activity. Is that doable?"

**A good response follows the shape above** — e.g.:

> What you're asking for: a scheduled weekly email to each user recapping what
> they did in the app that week.
>
> Feasibility: Feasible, with effort — the app already sends transactional email
> through `mailer/send.py`, so delivery is solved, but there's no scheduler and
> no place that aggregates per-user weekly activity. You'd add a weekly job and a
> query that rolls up activity per user.
> Size: a few files    Blockers: need a background scheduler (none today)
>
> Before: users only get emails when something happens to them directly (a reply,
> a mention) and have to open the app to see their week.
> After: every Monday each user gets one digest email — "12 new replies, 3
> mentions, 2 docs shared with you" — with links back in.
