# Paper structure reference

Section-by-section guidance for writing the paper. Default is **IEEE**; venue variants
are at the bottom. Read this before drafting (Phase 4). Length targets assume a full
paper (~8–12 pages, two-column IEEE); halve them for a short/conference paper.

## Table of contents
- [IEEE section structure](#ieee-section-structure)
- [Abstract](#abstract)
- [I. Introduction](#i-introduction)
- [II. Related Work / Background](#ii-related-work--background)
- [III. Methodology / System Design](#iii-methodology--system-design)
- [IV. Implementation](#iv-implementation)
- [V. Evaluation](#v-evaluation)
- [VI. Discussion / Limitations](#vi-discussion--limitations)
- [VII. Conclusion](#vii-conclusion)
- [References](#references)
- [Figures and tables](#figures-and-tables)
- [Venue variants](#venue-variants)

---

## IEEE section structure

```
Title, Authors, Affiliations
Abstract (150–250 words)
Index Terms (4–6 keywords)
I.   Introduction
II.  Related Work / Background
III. Methodology / System Design
IV.  Implementation
V.   Evaluation
VI.  Discussion / Limitations
VII. Conclusion (+ Future Work)
References
(Appendix, if needed)
```

Merge or split as the project warrants — e.g. a heavily-engineered system may fold
Implementation into Methodology, while an empirical study may split Evaluation into
"Experimental Setup" and "Results". Keep the spine: motivate → position → describe →
measure → reflect.

---

## Abstract
150–250 words, one paragraph, no citations. Hit five beats: (1) the problem and why it
matters, (2) the gap in existing approaches, (3) what you built/propose, (4) the key
result with a concrete number, (5) the takeaway. The abstract is the most-read part of
the paper — write it last, once you know the real numbers.

## I. Introduction
~1–1.5 pages. Funnel from broad context to your specific contribution:
- Open with the problem domain and why it's hard or important.
- Name the shortfall in current practice that motivates the work.
- State *your* approach in 2–3 sentences.
- **List contributions explicitly** as a bullet list ("The contributions of this paper
  are: …"). Reviewers look for this list; make it scannable and verifiable against the
  rest of the paper.
- Close with a paragraph mapping the paper's structure.

Common failure: burying the contribution. The reader must know your thesis by the end of
the first column.

## II. Related Work / Background
~1 page. Position the work honestly against prior art — this is argument, not a list.
Group related work thematically (e.g. "agentic LLM systems", "rule-based risk control"),
and for each group say how your work differs. Include any background a reader needs to
follow the methodology (define domain terms, prior techniques you build on).
- Use **real, verifiable citations**. If unsure a reference exists, web-search to confirm
  it or cut it. Fabricated or mis-attributed citations are a fast desk-reject.
- Don't strawman prior work; differentiate respectfully.

## III. Methodology / System Design
~2–3 pages, the technical heart. Describe the system precisely enough to reimplement:
- Overall architecture — lead with a system/architecture figure.
- Each major component: its job, inputs/outputs, the algorithm or model it uses.
- Key design decisions and *why* (trade-offs, constraints, invariants). The "why" is
  what distinguishes a paper from documentation.
- Formalize where it helps: equations, pseudocode (algorithm blocks), data schemas.
Ground every claim here in the Phase 1 code map — name real modules/algorithms, not
aspirations.

## IV. Implementation
~0.5–1 page (optional; merge into III if thin). Concrete realization details that matter
for reproducibility or credibility: languages/frameworks, notable libraries, scale (LOC,
#components), engineering challenges and how they were solved, determinism/safety
mechanisms. Pull facts from `pyproject.toml`/lockfiles and the source.

## V. Evaluation
~2–3 pages, the empirical core. **Use only real numbers from Phase 3** (`evidence/`).
- **Experimental setup**: what you ran, environment, configuration, data, seeds, sample
  sizes. Enough for reproduction.
- **Metrics**: define each metric and why it's the right one.
- **Results**: tables and figures with measured values. Interpret them — don't just dump
  numbers; say what each result means for the contribution.
- **Honesty**: if some evaluation couldn't run (secrets/GPU/paid APIs/live data), state
  it plainly and report what did run. Mark unrun results `[pending]` rather than guessing.
- For test-suite-as-evidence: report pass rates, coverage, and what invariant/property
  tests prove (e.g. a conservation/accounting invariant holding across N cases is a real
  correctness result).

## VI. Discussion / Limitations
~0.5–1 page. Interpret results at a higher level, then state **threats to validity and
limitations** candidly (internal, external, construct). Naming your own limitations
builds credibility and preempts reviewers. Note when/where the approach would not apply.

## VII. Conclusion
~0.5 page. Restate the contribution and the strongest evidence for it (no new claims),
then concrete future work that follows from the limitations.

## References
BibTeX in `references.bib`, IEEE numeric style (`[1]`), cited in order of appearance.
Every reference must be real and verifiable. Prefer primary sources (papers, specs) over
blogs. Web-search to confirm titles, authors, years, and venues.

## Figures and tables
- An **architecture figure** in Methodology is almost always worth it — generate a clean
  diagram (e.g. Graphviz/matplotlib, or TikZ in LaTeX).
- **Results figures** where a plot beats a table (trends, distributions). Save to
  `figures/`; reference each from the text and give every figure/table a descriptive
  caption that stands alone.
- Tables for precise numbers (metrics, ablations, configuration).

---

## Venue variants

**ACM** (`acmart`): similar spine; add CCS Concepts + ACM Reference Format; author-year
or numeric citations per the chosen sub-template (`sigconf`, `acmsmall`, …).

**Generic journal (Springer/Elsevier-like)**: IMRaD — Abstract, Introduction, Background/
Related Work, Methods, Results, Discussion, Conclusion. Numbered citations. Drop the
roman numerals; use plain section titles.

**Thesis chapter**: longer Background, more pedagogical, can relax page limits; keep the
same logical spine and a chapter-level contribution statement.

Whatever the venue, the four-phase workflow is unchanged — only the template and section
labels differ. Swap the LaTeX preamble in `assets/ieee-template.tex` for the venue's
document class and keep the content.
