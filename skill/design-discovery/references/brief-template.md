# Design Brief Template

Save the completed brief to `docs/design/YYYY-MM-DD-<topic>-brief.md`. Fill every section;
delete bracketed guidance. Keep it tight — this is a build spec, not an essay. The
color/type/layout/signature structure intentionally matches the `frontend-design` skill's
token vocabulary so the build step can follow it directly.

---

# Design Brief: [Project / page name]

**Date:** YYYY-MM-DD · **Prepared from:** [screenshots / interview / web research]

## Subject

- **What it is:** [one sentence]
- **Audience:** [who]
- **The page's one job:** [the single most important outcome]
- **What's distinctive about it:** [the real differentiator the design should express]

## Direction

[2–3 sentences naming the chosen aesthetic direction and its thesis — the feeling and the
reason. This is the north star the rest of the brief serves.]

## Color

[4–6 named hex values with roles. Name them by purpose, not just "primary/secondary".]

- `Ink #1A1A1A` — body text
- `Canvas #FBFAF7` — background
- `Signal #FF5A36` — single accent, used sparingly for [what]
- …

## Type

- **Display:** [face, where used, why it fits] — used with restraint
- **Body:** [face, why it pairs]
- **Utility (optional):** [mono/caption face for data, labels]
- **Scale & treatment:** [notes on weight, width, contrast, anything that makes the type
  itself part of the identity]

## Layout

[One-paragraph concept + an ASCII wireframe of the key view. Describe the hero / opening
move specifically — what's the most characteristic thing leading the page.]

```
[ascii wireframe]
```

## Signature element

[The ONE thing this page is remembered by — the interaction, visual device, or moment that
embodies the subject. Be specific enough to build.]

## Motion

[Appetite level + the specific moments: page-load sequence, scroll reveals, hover
micro-interactions, ambient atmosphere. Note reduced-motion behavior. If minimal, say so
and why.]

## References

[The strongest 3–5 from research, each with what's transferable — the mechanism, not just
"looks good" — and a link.]

1. **[Name]** ([url]) — [what specifically works and what we're taking from it]
2. …

## Constraints & guardrails

- [Brand/system/framework/accessibility constraints]
- [Must-include content]
- **Avoid:** [the anti-references and the generic AI-design defaults that don't fit here]

## Open questions

[Anything still unresolved the builder should flag before or during the build. Omit if none.]

---

*Next step: build with the `frontend-design` skill using this brief as the input.*
