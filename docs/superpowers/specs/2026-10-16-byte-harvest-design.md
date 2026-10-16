# Byte Harvest — PhilNITS FE review as a cozy farm game

**Date:** 2026-10-16 (Fri) · **Exam:** Sun 2026-10-25 · **Days left:** 9 (Oct 16–24)
**Player:** 4th-year BSIT student (CIT-U, on OJT), GitHub `zendrix-hub`
**Replaces:** `FE_PastPaper_Dojo.html` as the daily study tool. The Dojo stays available as a fallback, and it is still where the Oct 17 mock gets taken.

## 1. Goal

Turn the existing reviewer (240 past-paper questions, their keys and explanations, the SRS review queue, and the Oct 16–25 plan) into a Harvest Moon–style farm game. Studying is the core action of the game: every way to progress (planting, watering, harvesting, fishing, mining) is a retrieval-practice event, so playing and studying are the same thing.

Success means the player wants to open it every day, all 240 questions and all 21 topics are playable inside the game, and by M5 every topic also has a short interactive lesson.

## 2. Constraints

| Constraint | Value |
|---|---|
| Devices | Samsung Galaxy A21s (Exynos 850, Mali-G52, 3–4 GB RAM, 720×1600 → 360×800 CSS px, Chrome) and a Windows PC browser |
| Offline | Works offline after the first load; installable to the home screen (PWA) |
| Hosting | GitHub Pages: repo `zendrix-hub/-byte-harvest`, URL `https://zendrix-hub.github.io/-byte-harvest/`, base path `/-byte-harvest/`, deployed by GitHub Actions on push to `main` |
| Local repo | `~/byte-harvest` (Linux filesystem: `/mnt/c` is ~100× slower for `node_modules`) |
| Source data | `/mnt/c/Users/riva.zn/Documents/philnits reviewer/dojo_question_bank.json` (240 items) and the 240 WebP question images embedded in `FE_PastPaper_Dojo.html` (identical data, verified) |
| Stack | Vite 7, TypeScript (strict), Preact 10 + @preact/signals 2, plain CSS, SVG scene, vite-plugin-pwa 1, Vitest 3 + Testing Library, Playwright |
| Budgets | JS ≤ 120 KB gzip, CSS ≤ 20 KB gzip, ≤ 1,000 rendered SVG elements in the farm, no `backdrop-filter`, no SVG filters, animate only `transform`/`opacity`, ambient animation paused while a panel is open or battery saver is on |
| Touch | Targets ≥ 44 px (crop cells ≈ 38 px are the one exception), no horizontal scrolling at 360 px |
| IP | Original names and art only. No Harvest Moon names, characters, or assets |
| Storage | `localStorage["byteHarvest_v1"]`, JSON export/import, Dojo backup import; bad data never crashes the app |

## 3. Learning rules (non-negotiable)

These come straight from the handoff docs and the Dojo, which have already proven them.

1. **Commit before reveal.** The key, `why`, `trap`, `cue`, and `note` stay hidden until the player commits an answer.
2. **Confidence on every answer:** Sure / Unsure / Guess. A lucky guess counts as not learned.
3. **Every miss becomes a seed.** A miss or a lucky guess plants a crop for that question in its topic's field.
4. **Spaced watering.** A crop is *thirsty* (due) on its due date. A solid answer (correct, and not a guess) on a **later day** grows it: stage 1 → 2 (next due +2 days) → 3 (ready to harvest). Same-day answers never grow a crop. A miss wilts it one stage (minimum 1), and it's due tomorrow. New crops are due tomorrow. Due dates are capped at **2026-10-24**, but nothing is ever re-scheduled for the same day.
5. **Golden crops.** A crop that was ever sure-but-wrong is golden. Golden crops get watered first and sell for more.
6. **Pests = error tags.** Every miss gets a diagnosis: K Blight (concept), C Beetle (calculation), N Weed (notation), M Mole (misread / lost state), T Frost (too slow). Each pest shows a one-line remedy.
7. **Pace.** Subject A 90 s and Subject B 300 s per question; going over pace suggests Frost.
8. **Clean mock paper.** 2026S stays out of practice until its full mock is recorded (per subject), whether by Dojo import (M1) or a Festival mock (M6).
9. **Focus blocks.** After 25 focused minutes, stamina runs out and the game asks for a 3-minute break.
10. **Study what the exam asks.** Strategy & management (about ⅓ of Subject A in the real papers) is the first field listed. Exam-weight claims stay labeled as coming from the 2025S/2025A/2026S tally.
11. **Sources shown.** Every past-paper question shows `(2025S, FE, Subject-A, Q1)`. Lesson content (M2+) carries a `src` from the FE Prep Book Vol. 1/2 or a past paper.
12. **The diary feeds the reviewer chat.** At day's end the game produces the same report text the Dojo did, so the chat workflow keeps working.

## 4. Game world mapping

| Harvest Moon idea | Byte Harvest | FE meaning |
|---|---|---|
| Calendar to a festival | Real dates, **Harvest Festival = Oct 25** | Exam countdown; the almanac shows that day's plan from `FE_Final12_Plan.md` |
| Fields | 5 fields: **Market Garden** (strategy & management), **Tech Orchard** (hardware/OS/network/numbers/algorithms), **Thorn Hedge** (security A+B), **Greenhouse** (development & database), **Code Garden** (Subject B programming) | Exam domains |
| Crop kinds | 21 crops, one per bank topic (e.g., Business strategy = sunflower, Network = grape vine, Strings = string bean, Arrays & loops = pea pod) | Topics |
| Planting | A miss plants a seed (M1); finishing a lesson plants one (M2+) | Error-driven learning |
| Watering | Answer a thirsty crop's question again on a later day | Spaced repetition |
| Harvest & shipping bin | A ready crop is mastered: tap it or use the bin for gold | Evidence of retention |
| Pests | K/C/N/M/T badges on crops | Error taxonomy |
| Fishing pond | Subject A past-paper practice with filters | Practice sets |
| Mine | Subject B past-paper practice (M1); pseudocode trace floors (M4) | Subject B |
| Town & villagers | One villager per domain teaches Seed Packet lessons; villager hearts = domain mastery (M2) | Lessons |
| Workshop | Calculation sims with fresh variants (M5) | Calc topics |
| Festival grounds | Timed blitz and full mocks (M6) | Exam rehearsal |
| House & bed | Diary, sleep (copies the diary), backup, settings | Daily log |
| Stamina | 25-minute focus bar | Breaks |
| Gold | Earned from catches (5/3/1 g by confidence) and harvests (25 g, +15 golden); spent on decor in the Town shop (M2) | Motivation only. Gold never buys answers or skips reviews |

## 5. Art direction ("modern")

- Flat vector illustration with soft two-tone shading, rounded shapes, and a warm autumn palette. Ground shadows are semi-transparent ellipses, not filters.
- All art is code-drawn SVG (crops come in 3 growth stages × 21 kinds; buildings, farmer, trees, and pond are drawn the same way), so the only image downloads are the question images.
- Gentle idle motion: ready crops sway, harvest sparkles, falling leaves, chimney smoke, and the farmer walks to whatever you tap (≤ 380 ms). The scene tints for day and night from the local hour.
- UI: cream cards, chunky 3D buttons, the Nunito variable font (latin subset only), synthesized sound blips, and haptic ticks on Android. Sound, vibration, and battery saver can each be switched off.

## 6. Layout

- **Phone (portrait):** HUD bar on top (date, D-n, stamina, thirsty count, gold), farm below. Learning panels open full-screen; past-paper images fill the width, tap to zoom, scroll to pan.
- **PC (≥ 900 px):** farm on the left, panel on the right (up to 880 px wide) so the farm stays visible.
- **Farm world:** 600×1200 SVG units in a fixed layout. House, calendar board, shipping bin, and mine sit along the top, then the five fields with signboards, then the pond at the bottom. Grass and trees extend past the world edges to fill wide screens.

## 7. Milestones (one implementation plan each)

| Milestone | Ship by | Contents |
|---|---|---|
| **M1 Farm core** | Fri Oct 16 (tonight) | Farm scene, crops = past-paper misses with spaced watering, Fishing (A) and Mine (B) practice, pests, almanac, HUD, house (diary, sleep, backup, Dojo import, settings, offline download), stamina, PWA, GitHub Pages deploy |
| **M2 Town & Seed Packets** | Sun Oct 18 | Town scene and villagers; lesson engine (Hook → Model → Worked example → Your turn → plant); check types `mcq`, `match`, `bucket`, `order`, `numeric`; concept crops; content for every strategy & management subtopic in the bank; decor shop |
| **M3 Greenhouse** | Mon Oct 19 | Development + Database lessons; widgets: UML diagram ID, test-coverage counter, normalization sorter, GROUP BY/HAVING table evaluator |
| **M4 Mine depths** | Tue Oct 20 | ITPEC pseudo-language interpreter (`←`, if/elseif/else/endif, for/while/do-while, 1-based arrays, procedures/functions, recursion, mod, and/or/not, ≠ ≤ ≥); desk-check trace tables; fill-the-blank; ≥ 24 programs across arrays & loops, data structures, math & bits, recursion, sorting & searching, strings; random inputs for fresh variants |
| **M5 Workshop & Watchtower** | Wed Oct 21 | Generators with worked steps: two's complement, bases, shifts/masks, subnetting, transfer time & units, AMAT, paging, MIPS/CPI, availability, RAID, EVM, PERT, break-even, depreciation, CPU scheduling, FIFO/LRU, variance/SD, key counting; lessons for every remaining tech + security subtopic |
| **M6 Harvest Festival** | Thu Oct 22 | Timed blitz (90 s pace), full mocks with OMR grid and batch-of-10 bubbling, forensic review, "Top 20" cards from golden and pest crops, exam checklist, rest-day mode (Oct 24), festival screen (Oct 25) |

**Coverage rule (enforced by a test from M2 on):** every `(topic, sub)` pair in the bank maps to at least one Seed Packet with ≥ 2 interactive checks by the end of M5, and every topic has at least one generator or widget.

## 8. Data model (M1)

- `BankQuestion`: `id, key, agree, topic, sub, nopt, diff, why, trap, cue?, note?` (unchanged from the Dojo).
- `Attempt`: `d, p, ok, c, t, tag, cue, m, ts?`. This is Dojo-compatible, plus `ts`.
- `Crop`: `id ("paper:<qid>" | "concept:<id>"), kind, ref, topic, stage 1|2|3, due, last, plantedOn, sbw, pest`.
- `SaveData`: `v:1, farmer, att, crops, harvested, gold, days, mocks, hold, settings{sound,haptics,batterySaver}, seenAlmanac`.
- Dojo import maps `att` → `att` (deduplicated), `rev` → crops (`clean ≥ 1` → stage 2, due dates capped), and `mocks` → mocks (deduplicated). It is idempotent.

## 9. Out of scope

Accounts, cloud sync (export/import covers moving between devices), multiplayer, AI chat inside the game, audio files, Japan's domestic CBT FE content, real-money anything, and any exam fact without a source.
