---
name: design-transfer
description: Transfer the visual design of an existing website onto another application. Use whenever the user provides a website URL or screenshots and wants an app to adopt that look — phrases like "make my app look like this", "copy this site's design/style/theme", "apply this design to my app", "restyle X to match Y", "I want this UI", "same look as", "clone this design", or "design transfer". Also use when the user shares screenshots of one product and asks for another product's UI to match them. Analyzes the source with parallel subagents (palette, typography, layout, components, motion), asks prehook questions about scope and fidelity BEFORE touching code, writes a token spec, then restyles the target app.
---

# Design Transfer

Take the look-and-feel of a source website and re-create it inside the user's target
application — without breaking the target's architecture, conventions, or features.
The design is the deliverable; the target app's internals stay its own.

The single most expensive mistake in this workflow is restyling the wrong scope at the
wrong fidelity. That is why questions come before analysis, and analysis comes before
code.

## Step 0 — Prehook questions (always, before any analysis or code)

Ask with the structured question tool, in ONE batch. Skip any question the user's
request already answers — don't re-ask what they told you.

1. **Scope** — which part of the target gets the design? (whole app / one feature
   area / specific pages). Options should name the target's real surfaces, so read
   just enough of the target repo to name them accurately.
2. **Fidelity** — pixel-faithful port, or adapt to the target's existing brand
   (e.g. keep the target's brand colors but adopt the source's structure)? If the
   source palette is close to the target's brand, say so and recommend brand values.
3. **Layers** (multiSelect) — what to transfer: colors, typography, layout/structure,
   components (cards/tables/nav/forms), motion. Default: everything visible in the
   reference.
4. **Conflicts** (only when relevant) — if the target has a dark mode, a design-token
   system, or an accessibility baseline, ask whether those must keep working
   (recommend yes).

## Step 1 — Capture the source design with subagents

Get the raw material first:
- **URL given**: fetch the page (WebFetch). If the site is auth-walled, heavily
  client-rendered, or the fetched CSS is inconclusive, ask the user for screenshots
  instead of guessing.
- **Screenshots given**: analyze the images directly — they are ground truth.

Then fan out parallel read-only subagents, one per selected layer, each returning
structured notes (not prose):

- **Palette**: every distinct color with an approximate hex and its *role*
  (background, surface, primary accent, text, muted text, status). Note where the
  accent is spent — buttons, links, bars — and where it is withheld.
- **Typography**: families (or closest guess from letterforms), the scale (sizes and
  weights per role: page title, card heading, body, caption, table header), casing
  and letter-spacing habits (uppercase overlines, mono for identifiers).
- **Layout & spacing**: page skeleton as an ASCII wireframe, grid/column structure,
  container widths, corner radii, border and shadow treatment, the spacing rhythm
  (tight/generous, consistent gaps).
- **Components**: inventory of visible patterns — nav rail, stat cards, tables,
  pills, tabs, badges, forms, buttons — each with the 2-3 details that make it look
  the way it does (e.g. "status pill: light green bg, uppercase 10px bold").
- **Motion**: only what's evidenced (hover states, transitions, animated moments).
  Absence of evidence = minimal motion; don't invent choreography.

Also record the **signature element** — the one thing the page is remembered by —
and anything that is a *feature* rather than a *style* (a stats API, live data, an
invite flow). Design transfer copies style; features the target lacks get flagged,
not silently faked.

## Step 2 — Write the spec

One markdown file: token sheet + mapping plan. Keep it local — specs don't get
committed (gitignore the directory if needed). Contents:

- Color tokens (4–8 named hex values with roles), with the brand substitutions from
  the fidelity answer already applied.
- Type roles and treatments; layout skeleton (ASCII); component specs; motion notes.
- **Per-surface mapping**: for each target surface in scope, which source patterns it
  adopts, and — critically — the honesty list: source elements whose data/features
  the target doesn't have, each marked *extend backend*, *substitute with existing
  equivalent*, or *drop*, with a one-line reason. State these decisions; don't ask a
  second round of questions unless one is a genuine scope change.

## Step 3 — Apply to the target

- **Inventory the target's styling idiom first** (Tailwind? CSS variables? component
  library? theme provider?) and express the new design *in that idiom*. Never bolt on
  a second styling system, new fonts via CDN in a self-hosted app, or a chart library
  for a decorative bar.
- Respect the target's conventions: localization for user-facing copy, existing
  hooks/utilities, naming and file-organization rules, accessibility patterns
  (labels, roles, focus states).
- Keep dark mode / theme switching working if the target has it — map the source's
  light design onto the target's existing dark tokens rather than hardcoding one look.
- Reuse before rebuilding: if the target already has a table, pill, or card
  component, restyle it; don't fork a parallel copy.
- Don't rename the target's internal identifiers to match the source's branding.

## Step 4 — Verify like a user

- Rebuild and run the target app; drive the restyled surfaces in a real browser.
- Compare side-by-side with the reference (screenshot vs. screenshot) and fix drift:
  spacing, weights, radii, and accent placement are where ports usually miss.
- Check both themes if applicable, a narrow viewport, and the app's own lint/
  typecheck/tests for everything touched.
- Close by listing what was transferred, what was substituted or dropped (from the
  honesty list), and where the spec file lives.

## Checklist

Copy into todos when starting:

1. Prehook questions (scope, fidelity, layers, conflicts) — one batch
2. Capture source (fetch or screenshots) + parallel layer subagents
3. Spec written: tokens + per-surface mapping + honesty list
4. Target idiom inventoried; design applied in scope
5. Side-by-side verification + target's checks pass
