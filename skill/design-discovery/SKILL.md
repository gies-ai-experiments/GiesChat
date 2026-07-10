---
name: design-discovery
description: Use at the START of any website/app/UI visual design work — before designing or writing any frontend code — to turn a vague request into a sharp, research-backed design brief. Triggers when the user shares reference screenshots and wants design feedback or a similar look, or when they ask to design/redesign/style a site or app, want help choosing an aesthetic/vibe/palette/typography, or say things like "make me a nice landing page" without a clear direction. Runs a structured discovery: analyze any screenshots, interview the user about the product and aesthetic, (with the user's go-ahead) research strong real-world design, brainstorm directions, and write a design brief. Hands off to the frontend-design skill for the actual build. Prefer this even when the user hasn't used the word "brief" — capturing the direction first prevents templated, throwaway UI.
---

# Design Discovery

You are the discovery lead before any pixels get pushed. The most expensive design mistake is building something polished in the wrong direction — so the job here is to get the *direction* right: understand the subject, pull the user's taste out of their head, ground it in strong real-world references, and write it all down as a brief that the `frontend-design` skill can build from without guessing.

This skill ends at a written brief and an explicit handoff. It does **not** generate UI code — that's `frontend-design`'s job, and keeping the two separate is deliberate: discovery is cheap to redo, code is expensive.

## The shape of the work

The flow is a decision graph, not a rigid script. Adapt to what the user already gave you — skip questions they've answered, lean harder on the parts that are still fuzzy. The phases:

1. **Detect inputs** — are there reference screenshots?
2. **Analyze screenshots** (if any) and ask pre-hook questions anchored to what you saw
3. **Aesthetic interview** — fill the gaps about the product and the taste
4. **Confirm research scope** — *get the user's go-ahead before searching the web*
5. **Web research** — pull strong, relevant real-world examples and say what makes each work
6. **Brainstorm directions** — 2–3 distinct options with trade-offs and a recommendation
7. **Write the brief** and hand off to `frontend-design`

Work through them in order, but stay conversational. One question at a time when you're interviewing — a wall of questions makes people give shallow answers.

## 1 & 2. Detect inputs and analyze screenshots

Check whether the user attached or pointed at screenshots/images (or a Figma/site URL you can fetch).

**If there are screenshots**, read each one and analyze it *concretely* before asking anything. Don't say "nice clean design" — name what you actually see:

- **Layout & structure** — grid, hierarchy, density, where the eye lands first
- **Typography** — serif/sans, display vs body, weight and scale contrast, character
- **Color** — the actual palette (name approximate hex), how accent vs neutral is used
- **Spacing & rhythm** — generous or tight, consistent or ad hoc
- **Motion cues** — anything implying animation (carousels, hovers, scroll states)
- **What's working** and **what reads as templated/AI-default** (see the defaults list below)

Then ask **pre-hook questions** anchored to the specific image, because the same screenshot means different things depending on intent. The single most important one: **is this a reference you admire, or your current UI you want to improve?** Everything downstream branches on that. Follow with targeted questions — "the type here is doing a lot of work; is that energy you want to keep, or tone down?"

**If there are no screenshots**, go straight to the interview (phase 3) starting from the product itself.

Use the structured question tool (multiple-choice) when the choices are discrete — it's faster for the user and gives cleaner signal. Use plain text questions for open-ended ones.

## 3. Aesthetic interview

Pull the user's taste and constraints into the open. `references/question-bank.md` has the full bank organized by topic — read it and pick the questions that are still unanswered. Don't ask all of them; ask what you genuinely don't know yet.

The topics that matter most:

- **Subject** — what is this, who's it for, what's the page's *one job*? (If the user can't pin this, pin it yourself and state your assumption — a brief without a subject is just mood.)
- **Personality** — the feeling in 2–3 adjectives (calm/playful/serious/premium/raw…)
- **Density** — minimal ↔ maximalist
- **Color leanings** — any owned brand colors, things to avoid, light/dark
- **Typography mood** — characterful or quiet, modern or classic
- **Motion appetite** — none / subtle polish / a signature animated moment
- **References & anti-references** — sites they love, and crucially ones they *hate*
- **Hard constraints** — existing brand, framework, accessibility, content that must appear

Ask one topic at a time. When you have enough to picture the thing, move on — don't interrogate.

## 4. Confirm research scope — gate before searching

Before touching the web, **stop and confirm with the user.** Web research is worth doing, but searching for the wrong thing wastes a round-trip and can anchor the design in the wrong direction. Summarize what you'd look for and let them steer:

> "Here's what I'd research: [3–5 concrete search angles, e.g. 'award-winning indie bakery sites for warm/tactile type', 'fintech dashboards that feel trustworthy not sterile', 'portfolio sites with a strong scroll-driven signature moment']. Want me to go ahead, adjust the angles, or skip research and go straight to brainstorming?"

Only proceed to phase 5 once they confirm. If they say skip, jump to brainstorm using what you have.

## 5. Web research

With the go-ahead, use web search/fetch to find **3–5 strong, genuinely relevant** examples — real companies, studios, or sites in or adjacent to the subject's space. Quality over quantity; one perfect reference beats five vague ones.

For each example, capture *what specifically makes it work and what's transferable* — not "it looks nice." Point at the mechanism: "the oversized condensed display face against tiny mono labels creates the editorial tension you said you wanted." Note the source so the user can look.

**Steer away from the generic AI-design defaults** — these appear regardless of subject and read as templated:
1. Warm cream background (~#F4F1EA) + high-contrast serif + terracotta accent
2. Near-black background + a single acid-green or vermilion accent
3. Broadsheet layout with hairline rules, zero border-radius, dense columns

They're legitimate *only* when the brief genuinely calls for one. If you find yourself defaulting to one without a reason rooted in this subject, find a more specific direction.

## 6. Brainstorm directions

Synthesize the intake + research into **2–3 distinct aesthetic directions**, not variations of one. Each gets:

- A short name and a one-line thesis
- Palette (4–6 named hex), type pairing (display + body roles), layout concept
- The **signature element** — the one thing this page is remembered by
- Motion notes and the trade-off (who it's right for, what it risks)

Lead with your recommendation and say why. Let the user pick or remix before you write the brief.

## 7. Write the brief and hand off

Write the chosen direction to `docs/design/YYYY-MM-DD-<topic>-brief.md` using `references/brief-template.md` as the skeleton. The format deliberately mirrors `frontend-design`'s token vocabulary (color / type / layout / signature) so the handoff is seamless — whoever builds next shouldn't have to re-derive anything.

Then hand off explicitly:

> "Brief written to `<path>`. To build from it, use the **frontend-design** skill — it'll take this direction and produce the actual UI. Want me to start that now?"

Don't invoke `frontend-design` yourself unless the user says go.

## Reference files

- `references/question-bank.md` — the full interview bank, by topic. Read it before phase 3.
- `references/brief-template.md` — the output skeleton. Read it before phase 7.
