---
name: research-paper
description: >-
  Turn a software project / codebase into a publication-ready academic research paper
  for a journal or conference (default: IEEE two-column format). Use this whenever the
  user wants to write up, document, formalize, or publish their code as a research paper,
  academic paper, paper draft, whitepaper, journal/conference submission, or thesis
  chapter — e.g. "write a research paper about this project", "turn my repo into an IEEE
  paper", "I want to publish this code academically", "make an academic write-up of my
  system", "draft a paper from my codebase". The skill maps the repository, interviews
  the user with a short focused batch of questions about research framing and
  contributions, runs the project's own tests/backtests/benchmarks to produce REAL
  empirical results, and writes a full paper as Markdown + submission-ready LaTeX with a
  BibTeX reference file. Prefer this over ad-hoc writing whenever the goal is a formal
  academic paper grounded in an actual codebase.
---

# Research Paper

Turn a working codebase into a credible, submission-ready academic paper. The hard part
of writing a paper from code is not prose — it's *framing*: finding the real research
contribution buried in an engineering project, grounding every claim in either the code
or measured results, and resisting the urge to fabricate numbers. This skill keeps you
honest by reading the actual source, running the project's own evaluation harness for
real figures, and asking the user only what the code cannot tell you.

By default the paper targets **IEEE** format and produces a `paper/` directory with a
readable Markdown draft, a submission-ready LaTeX file, and a BibTeX bibliography. The
user can override venue/format at any time.

## The workflow

Run these four phases in order. Each phase feeds the next — don't write prose before
you've mapped the code and run the evaluation, or you'll invent claims you can't support.

1. **Map the codebase** — build an accurate mental model of what the system does.
2. **Interview the user** — one focused batch of questions for what code can't reveal.
3. **Run the evaluation** — execute the project's tests/backtests to get real numbers.
4. **Write the paper** — IEEE-structured Markdown + LaTeX, grounded in phases 1–3.

Track these as four todos so none gets skipped — phase 3 (running real evaluations) is
the one most often dropped under time pressure, and it's the one that separates a real
paper from a glossy README.

---

### Phase 1 — Map the codebase

Goal: understand the system well enough to describe its architecture, algorithms, and
design decisions precisely. A paper that misdescribes its own system is worse than none.

Read, in roughly this order:
- `README`, `CLAUDE.md`, `docs/`, and any design notes — these usually state the
  project's *intent* and vocabulary. Adopt the project's own terms; don't rename things.
- `pyproject.toml` / `package.json` / `Cargo.toml` / etc. — name, entry points,
  dependencies (dependencies tell you what's novel vs. off-the-shelf), and the test
  configuration.
- The main source tree — identify the core modules, the data flow, the key algorithms,
  and which parts are genuinely novel vs. standard plumbing.

For anything beyond a small repo, **dispatch parallel Explore/general-purpose subagents**
to map different subsystems concurrently (e.g. one per top-level package), then
synthesize. You only need the conclusions — architecture, algorithms, interfaces — not
file dumps. Produce a short internal system map (components, how they connect, what's
novel) before moving on. This map becomes the Methodology and Implementation sections.

While mapping, actively hunt for the **research angle**: what does this system do that a
reader would find non-obvious, generalizable, or worth citing? Candidate contributions
are usually one of: a novel architecture or algorithm, an empirical finding, a new way to
combine known techniques, a dataset/benchmark, or an engineering result (e.g. a
determinism/safety guarantee). Note 2–4 candidates to confirm with the user.

---

### Phase 2 — Interview the user (one focused batch)

Code reveals *what* and *how*. Only the user can reliably give you *why it matters*,
*what's new*, and *who it's for*. Ask a single focused batch of **3–6 questions** using
the AskUserQuestion tool — enough to frame the paper, not a slog. Lead with your own
analysis so the user is reacting, not generating from scratch: propose the contribution
you think is strongest and let them correct it.

Cover these, skipping any the code/README already answers unambiguously:
- **Core contribution / research question.** Offer your top 2–3 candidates from Phase 1
  and ask which is the real thesis (or what you missed). This is the single most
  important answer — everything else hangs off it.
- **Novelty / related work.** What prior systems or papers is this closest to, and how
  does it differ? Ask for any references they already know; you'll find more later.
- **Target venue & author info.** Confirm IEEE (or switch), and collect title, author
  name(s), affiliation, and whether it should be anonymized for double-blind review.
- **Evaluation.** What claims need empirical backing, and which tests/backtests/
  benchmarks in the repo produce the relevant numbers? (Feeds Phase 3.)
- **Scope / audience.** Conference short paper vs. full journal article; how much space.

Keep it to one batch where possible. If a critical answer opens a genuinely new branch,
a brief second round is fine — but don't interrogate; the user came for a paper, not a
viva.

---

### Phase 3 — Run the evaluation for REAL results

This is what makes it a paper and not marketing. Wherever feasible, run the project's own
evaluation and report measured numbers, tables, and figures — never invent results.

Detect what's runnable (in rough priority order):
- A dedicated eval/backtest/benchmark entry point (a CLI subcommand, a `scripts/`
  runner, a `benchmarks/` dir, a Makefile target like `make bench`).
- The test suite (`pytest`, `npm test`, `cargo test`, `go test`) — even pass rates,
  coverage, and invariant/property tests are reportable evidence (e.g. "all N accounting
  -invariant tests pass", "92% line coverage").
- Example scripts or notebooks the README points to.

Set up the environment as the project documents (e.g. `uv sync`, `pip install -e .`,
`npm install`), then run. Capture raw output to `paper/evidence/` so every number in the
paper is traceable. Turn measurements into figures where a plot communicates better than
a table (matplotlib/your tool of choice → `paper/figures/`).

**If something can't be run** — needs secrets, paid APIs, GPUs, or live data — say so
explicitly. Don't fabricate. Either (a) report the parts that *do* run, (b) ask the user
to paste results they have, or (c) mark the table `[results pending]` and tell the user
exactly what to run. Honesty about what was measured is itself a scientific virtue and
keeps the paper defensible.

Record, for the Evaluation section: what was run, the environment/config, the metrics,
and any caveats (sample size, seeds, non-determinism).

---

### Phase 4 — Write the paper

Write the full paper grounded strictly in Phases 1–3. Default structure is IEEE; the
detailed section-by-section guidance — what belongs in each section, length targets, and
common failure modes — lives in `references/paper-structure.md`. **Read that file before
drafting.** For the LaTeX scaffold, copy and fill `assets/ieee-template.tex`; for other
venues see the notes at the end of the structure reference.

Output a `paper/` directory:

```
paper/
  paper.md          # readable full draft — review here
  paper.tex         # submission-ready LaTeX (IEEE by default)
  references.bib    # BibTeX entries
  figures/          # generated plots/diagrams
  evidence/         # raw eval output backing every number (traceability)
```

Core writing principles (the why matters more than any rule):
- **Every claim is backed by the code or a measured result.** If you can't point to a
  file or a number in `evidence/`, soften the claim or cut it. Reviewers attack
  unsupported assertions first.
- **Adopt the project's own vocabulary** from Phase 1 so the paper and the code agree.
- **Contribution up front.** State the contribution in the abstract and intro, then spend
  the body earning it. A reader should know the thesis after the first paragraph.
- **Related work is honest positioning, not a literature dump.** Use real, verifiable
  references. If you're unsure a citation exists, find it (web search) or drop it —
  fabricated references are the fastest way to get desk-rejected.
- **Methodology must be reproducible.** Someone should be able to reimplement from your
  description. This is where the Phase 1 system map pays off.
- **Results report what you measured**, with honest limitations. A paper that names its
  own threats to validity reads as more credible, not less.

After drafting, present `paper.md` to the user for review, summarize what's measured vs.
pending, and iterate. Offer to compile the LaTeX (e.g. `pdflatex`/`latexmk`) if a TeX
toolchain is available, or point them to Overleaf with the `paper/` contents.

---

## Notes

- **Generality.** This works for any codebase — ML systems, web apps, libraries, quant/
  trading systems, compilers. The four phases don't change; only the runnable evaluation
  and the natural framing do.
- **Don't overclaim novelty.** If the project is a solid engineering effort without a
  sharp research novelty, frame it accurately as a systems/experience paper rather than
  inflating it. Reviewers reward honest scoping.
- **Venue switching.** If the user picks ACM, a generic journal, or a thesis chapter,
  keep the same four phases and swap the template/section conventions per
  `references/paper-structure.md`.
