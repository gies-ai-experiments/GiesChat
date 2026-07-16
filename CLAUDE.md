# GiesChat

Customized LibreChat deployment for Gies College of Business. Setup, dev commands, workspace layout, and test instructions are in [README.md](README.md) — read that first; don't duplicate it here.

## Non-obvious operational facts

- **Deploys automatically on push to `main`** via `.github/workflows/azure-deploy.yml` → Azure Web App `gieschat` (image `dlacrgieschat.azurecr.io/gieschat/api`). Pushing to main IS deploying — treat it accordingly.
- **`gh issue list` / `gh pr list` without `-R` resolve to upstream LibreChat** (fork inherits issue redirect). Always use `-R gies-ai-experiments/GiesChat`.
- **Upstream sync**: remote `upstream` = danny-avila/LibreChat. Sync pattern is a merge commit on main (see `00ef3ad5a`, 2026-07-14). Keeping Gies customizations mergeable with upstream is an open concern — see issue #11 before large refactors of shared LibreChat code.
- App config (endpoints, MCP servers, feature flags like `interface.brainstormRooms`) lives in `librechat.yaml`; secrets in `.env` (never commit).
- MS365 Outlook MCP Entra redirect-URI fix: `infra/ms365-mcp/README.md` (AADSTS50011).
- Collaborator **ashcastelinocs124** (Ash) commits directly to main — pull before starting work.

## Current Focus

Decide upstream-drift strategy (issue #11) and land or close the left-nav redesign proposal (PR #12, branch `design/nav-redesign-proposal`). Issue #8 (embed MindForum room features) is the larger backlog item.

## Session Log

### 2026-07-16
- Completed: Created CLAUDE.md (un-ignored it in .gitignore). Pulled 118 commits (Ash's work + upstream sync). Reviewed issue #11 with fresh drift numbers (160 custom commits, 167 in-place edits — trajectory confirmed). Reviewed Replit-on-Azure email thread; sent Brandon a 5-item agenda for the 7/22 12pm CT meeting (auth model, Azure deploy mechanics, DPA, edu credits, feedback).
- Next: Replit meeting 7/22 12:00–12:30pm CT (only 30 min booked for 5 agenda items — consider having Ash extend to 60). Issue #11 decision checkboxes still unanswered; PR #12 (nav redesign) and issue #8 (MindForum rooms) open.
