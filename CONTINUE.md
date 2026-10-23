# CONTINUE — Byte Harvest handoff

Read this file first in any new session (Claude Code or a human). It says where the work stands, what to do next, and when to stop.

## Hard stop

- **Work only until the end of Fri 2026-10-23 (Asia/Manila, UTC+8).** Do not build, push or run agents on **Sat 2026-10-24** or **Sun 2026-10-25** (exam day). On those days, at most reply "Paused until after the exam."
- If the session hits its usage limit tonight, resume after the reset **only if it is still 2026-10-23**. Otherwise stop.
- Before every push, check `date`. If the date is past 2026-10-23, don't push.

## Where things live

| What | Where |
|---|---|
| Live game | https://zendrix-hub.github.io/-byte-harvest/ (GitHub Pages; deploys on push to `main`) |
| Repo | `zendrix-hub/-byte-harvest` (note the leading dash) · local `~/byte-harvest` (main) |
| M2 work | worktree `~/byte-harvest-m2`, branch `m2-town` (also pushed to origin) |
| Design spec | `docs/superpowers/specs/2026-10-16-byte-harvest-design.md` (§3 learning rules are non-negotiable) |
| M2 plan | `docs/superpowers/plans/2026-10-21-byte-harvest-m2-town-seed-packets.md` |
| M2 progress ledger | `~/byte-harvest-m2/.superpowers/sdd/2026-10-21-byte-harvest-m2-town-seed-packets/progress.md` (git-ignored; the source of truth for task status and rulings) |
| Study sources | `/mnt/c/Users/riva.zn/Documents/philnits reviewer/` (question bank, Dojo, Prep Book PDFs); extracted book text at `~/.cache/bh-books/` |

## Status (2026-10-23, final)

- **M1 farm core**, **built-in question text** and **M2 Town & Seed Packets** are all **live on `main`**.
- M2 includes:
  - all 7 tasks
  - the final-review fixes
  - the follow-up fixes: no match-check diagonal, the gate tap area cleared, and lesson-load errors handled
- Verification:
  - 172 unit tests
  - e2e: 12 passed
  - App JS 67.2 KB gz and lessons 31.6 KB gz
  - every fix wave independently re-reviewed
- One small leftover is accepted and not a bug: order checks never place a step in its own starting slot. Grading is unaffected.
- **M3–M5:** skipped by the user's choice. **M6:** dropped before the exam.
- **Nothing is left to do before the exam.** The next session should only clean up the scratch worktrees (step 5), and only after the exam.

## Next steps, in order

1. Read the ledger and `git log main..m2-town`. Don't redo finished work.
2. If the follow-up commits exist on `m2-town` and aren't on `main`, check them (step 3), then push (step 4). If the follow-up never landed, leave it; what's live is already good.
3. Verify in a clean checkout of the `m2-town` head:
   ```bash
   export LD_LIBRARY_PATH=$HOME/.cache/bh-pwlibs/root/usr/lib/x86_64-linux-gnu   # Chromium libs for e2e on this WSL
   npm run typecheck && npm test && npm run build && npm run budget && npm run check:pwa
   E2E_PORT=4190 npx playwright test
   ```
   All must pass. The budget line must show App JS ≤ 120 KB gz and lessons ≤ 120 KB gz.
4. Fast-forward `main` to the verified commit and push: `git push origin <sha>:main`. Then confirm the deploy: the `assets/index-*.js` name in `curl -s https://zendrix-hub.github.io/-byte-harvest/` must match `dist/assets/index-*.js` from the local build. (`gh` isn't logged in, so use this check instead of `gh run`.) Optionally run e2e against live with `BASE_URL=https://zendrix-hub.github.io/-byte-harvest/`.
5. Remove the scratch worktrees when done: `git worktree remove ~/bh-ship` and (after merge) `~/byte-harvest-m2`. Keep the ledger's `Ruling:` lines in the final summary for the user.
6. Stop. Don't start M6 or anything new without the user.

## Rules that bind any work

- Learning rules (spec §3): commit before reveal, Sure/Unsure/Guess on every answer, lucky guesses count as not learned, misses plant crops, growth only on later days (+1, then +2), due dates capped at 2026-10-24, 2026S held until its mock is recorded (`isHeld` in `src/core/practice.ts`), and sources shown.
- Phone budgets: JS ≤ 120 KB gz, no `backdrop-filter` or SVG filters, touch targets ≥ 44 px, no horizontal scroll at 360 px.
- Never commit the Prep Book PDFs or their extracted text (the repo is public).
- Agents share one git index in a worktree, so always commit with a pathspec (`git commit -m … -- <paths>`).
- `/tmp` is a 3.9 GB RAM disk wiped on reboot. Keep anything durable in the repo or `~/.cache`.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
