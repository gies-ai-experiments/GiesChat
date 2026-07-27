---
name: gies-deck-playbook
description: Craft guidance for building PowerPoint decks in GiesChat — narrative structures, how many slides a topic needs, how to use an uploaded design's layouts, and what makes a slide weak. Load before planning a deck.
---

# Gies deck playbook

This is about what makes a deck good. It says nothing about which tool to call
— the PowerPoint MCP carries its own instructions for that.

## Pick a narrative arc before picking slides

Choose one and let it dictate the outline. Mixing arcs is what makes a deck
feel like a list of facts.

| Arc | Shape | Use when |
|---|---|---|
| **Situation → Complication → Resolution** | Where things stand, what broke, what to do | Recommendations, case analyses, consulting-style decks |
| **Problem → Evidence → Solution → Ask** | Name it, prove it, fix it, request | Pitches, funding requests, project proposals |
| **Chronological** | Before, during, after | Post-mortems, project recaps, case histories |
| **Thematic** | 3–5 parallel pillars | Overviews, orientation decks, literature surveys |
| **Compare → Contrast → Choose** | Option A, option B, the call | Vendor selection, strategy choices, build-vs-buy |

Every arc ends with a slide that says what the audience should now think or
do. A deck that stops after the last fact has no ending.

## How many slides

Roughly one slide per idea, plus a title slide and a closing slide. If you
cannot name the single idea a slide carries, it should not exist.

| Setting | Typical range |
|---|---|
| Class assignment | 8–12 |
| 5-minute pitch | 5–7 |
| Lecture / workshop segment | 12–18 |
| Executive readout | 6–10, detail in an appendix |

Honor an explicit request over these ranges. A user asking for 20 slides gets
20 slides. The floor is 5 either way.

## Structure inside a slide

- **The title carries the point.** "Enrollment fell 18% after the fee change,"
  not "Enrollment." A reader skimming only titles should get the argument.
- **Three to five bullets.** Six is a signal the slide is really two slides.
- **Bullets are parallel** — same grammatical shape, roughly the same length.
- **One idea per slide.** Two ideas means two slides.
- **Speaker notes are what a presenter says**, not the bullets restated. If
  notes just repeat the slide, drop them.

## Working with an uploaded design

When the user uploads their own deck, the MCP strips it to a design shell and
reports `design_layouts` — the layouts their own slides actually used.

- Build **only** with those layouts. Every other layout in the file is an
  unstyled Office default and will visibly break the design.
- A design layout with zero placeholders is a styled background. Put content on
  it with text boxes.
- Match the user's density. If their slides ran three bullets, do not ship six.

## What makes a slide weak

- A title that names a topic instead of making a claim.
- Bullets that are full sentences, or that run past two lines.
- A wall of text where a comparison table belongs.
- Numbers with no baseline — "revenue grew 12%" against what, over what?
- Content invented to fill a slide the outline demanded. Cut the slide instead.
- A closing slide that says "Questions?" and nothing else. Close with the ask
  or the takeaway; questions can be spoken.

## Audience calibration

- **Students / peers** — define terms, more context, worked examples.
- **Faculty / reviewers** — method and evidence up front, assumptions stated.
- **Executives** — the recommendation on slide 2, supporting detail after.
- **External / recruiters** — plain language, zero internal jargon or acronyms.
