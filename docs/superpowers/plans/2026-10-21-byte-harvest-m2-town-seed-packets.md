# Byte Harvest M2 — Town & Seed Packets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Short interactive lessons ("Seed Packets") for every strategy & management subtopic in the bank. Finishing a lesson plants a concept crop, and that crop is watered on later days by redoing the lesson's checks.

**Architecture:** Lesson content is static JSON (`src/data/lessons/strategy.json`), lazy-loaded as one precached chunk, like the question text. A pure core module (`src/core/lessons.ts`) records lesson runs and drives concept crops through the existing `applyAnswer` SRS. The UI adds a Town panel (villager plus packet list) and a Lesson panel (Hook → Model → Worked example → Your turn → plant), reached from a new Town gate on the farm and from the Market Garden field panel.

**Tech Stack:** Vite 7, Preact 10 + @preact/signals 2, TypeScript strict, Vitest 3 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-byte-harvest-design.md` (§3 learning rules, §4 Town row, §7 M2 row, §7 coverage rule)

**Scope cut, agreed 2026-10-21 (4 days to the exam):** no decor shop. "Town" is a panel reached through a gate on the farm, not a second walkable scene. Only the Market Garden villager is built; the other four domains show "arrives later" in Town. M3–M5 are skipped, so the coverage test checks strategy topics only.

## Global Constraints

- JS ≤ 120 KB gzip app shell, CSS ≤ 20 KB gzip; lesson content ships as a lazily loaded chunk with its own budget of **≤ 120 KB gzip**.
- No `backdrop-filter`, no SVG filters; animate only `transform`/`opacity`.
- Touch targets ≥ 44 px; no horizontal scrolling at 360 px.
- Original names and art only (no Harvest Moon names/characters).
- **Commit before reveal:** a check's answer, `why`, and correctness stay hidden until the player commits an answer **and** picks a confidence (Sure / Unsure / Guess).
- **Lucky guesses count as not learned.** A run is *solid* only if every check is correct and none was answered with Guess.
- **Same-day answers never grow a crop.** Due dates are capped at 2026-10-24 (the existing `capDue` handles this).
- **Sources shown:** every packet shows its `src` list. Allowed forms: `FE Prep Book Vol.1 §7.2.2 p.270`, or a past-paper label `(2025S, FE, Subject-A, Q12)`.
- Bad or old save data never crashes the app: older saves have no `lessons` key, and the normalizer defaults it.
- Base path `/-byte-harvest/`. The book PDFs and their extracted text are **never committed** (public repo).
- E2E on this machine needs `export LD_LIBRARY_PATH=$HOME/.cache/bh-pwlibs/root/usr/lib/x86_64-linux-gnu`.

## Review Focus

1. **Reopening a lesson the same day it was planted:** it must not grow the crop (`same-day`). It must also not plant a second crop, or wilt the crop when the run is solid. → Task 2 test `same-day rerun neither grows nor duplicates`.
2. **Closing the panel mid-lesson:** nothing is recorded and no crop is planted; reopening starts from the Hook. → Task 5 test `closing mid-lesson records nothing`.
3. **Old saves without `lessons` / `DayLog.lessons`, or garbage in them:** they load cleanly with defaults. → Task 2 test `normalizes missing or bad lesson logs`.
4. **A concept crop whose packet id no longer exists** (content renamed later): tapping it must not crash. It shows a toast and still allows harvest. → Task 6 test `unknown packet crop shows toast`.
5. **Long lesson text and wide match/bucket checks at 360 px:** no horizontal scroll. → Task 7 e2e test `lesson fits a 360 px phone`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/lessons/types.ts` (create) | `Check`, `Packet` types |
| `src/data/lessons/strategy.json` (create) | All strategy & management packets (content) |
| `src/data/lessons/index.ts` (create) | Lazy loader + sync cache: `loadPackets()`, `getPacket(id)`, `packetsVersion` signal |
| `src/core/checks.ts` (create) | Pure grading: `gradeCheck(check, answer) → boolean` |
| `src/core/lessons.ts` (create) | `finishLesson`, `lessonStats`, hearts |
| `src/core/state.ts`, `src/core/save.ts`, `src/core/report.ts` (modify) | `lessons` save field, `DayLog.lessons`, diary line |
| `src/ui/lesson/CheckView.tsx` (create) | Renders one check of each type, collects an answer |
| `src/ui/lesson/LessonPanel.tsx` (create) | Step flow, confidence, reveal, plant summary |
| `src/ui/town/TownPanel.tsx` (create) | Villager card, hearts, packet list, thirsty lessons |
| `src/ui/lesson/lesson.css` (create) | Styles for both |
| `src/app/panel-types.ts`, `src/app/panels.tsx`, `src/ui/actions.ts` (modify) | `town` and `lesson` panels; concept watering |
| `src/scene/layout.ts`, `src/scene/art.tsx`, `src/scene/Farm.tsx` (modify) | Town gate landmark |
| `src/ui/activities/FieldPanel.tsx` (modify) | "Lessons in Town" button on the strategy field |
| `scripts/check-budget.mjs`, `scripts/check-pwa.mjs` (modify) | Lessons budget, lessons chunk precached |
| `tests/data/lessons.test.ts`, `tests/core/checks.test.ts`, `tests/core/lessons.test.ts`, `tests/ui/lesson.test.tsx`, `tests/ui/town.test.tsx` (create) | Tests |
| `e2e/farm.spec.ts` (modify) | Lesson flow on phone and PC |

---

### Task 1: Lesson types, grading, and loader

**Files:**
- Create: `src/data/lessons/types.ts`, `src/core/checks.ts`, `src/data/lessons/index.ts`, `src/data/lessons/strategy.json` (seed with **two** real packets for now: `bs-balanced-scorecard` and `pm-evm`; Task 3 fills in the rest)
- Test: `tests/core/checks.test.ts`

**Interfaces:**
- Produces:
```ts
// types.ts — all strings use the inline markup of qtext.ts (`code`, **bold**, ^{sup}, _{sub}, \n)
export type Check =
  | { t: 'mcq'; q: string; opts: string[]; a: number; why: string }                 // a = index into opts
  | { t: 'match'; q: string; pairs: [string, string][]; why: string }               // correct left→right; UI shuffles the right side
  | { t: 'bucket'; q: string; buckets: string[]; items: [string, number][]; why: string } // item → bucket index
  | { t: 'order'; q: string; steps: string[]; why: string }                         // correct order; UI shuffles
  | { t: 'numeric'; q: string; a: number; tol?: number; unit?: string; why: string };
export type CheckAnswer = number | number[];  // mcq/numeric: number; match: right-index per left row; bucket: bucket per item; order: step indices in chosen order
export interface Packet {
  id: string;            // kebab-case, unique, prefix by topic: bs- ss- sm- pm- al-
  topic: string;         // a TOPICS key in the strategy field
  subs: string[];        // bank `sub` values this packet covers (exact strings)
  title: string;
  hook: string;          // 1–2 sentences: why the exam cares
  model: string[];       // 3–6 bullet facts
  example: { q: string; steps: string[] };  // worked example
  checks: Check[];       // ≥ 2, at least 2 different `t` values when ≥ 3 checks
  trap?: string;         // the classic wrong answer and why
  src: string[];         // ≥ 1, forms in Global Constraints
  qids: string[];        // bank question ids for the subs (practice links)
}
```
- `gradeCheck(c: Check, ans: CheckAnswer): boolean` in `src/core/checks.ts`; numeric uses `Math.abs(ans - a) <= (tol ?? 0)`.
- `loadPackets(): Promise<Packet[]>`, `getPacket(id: string): Packet | null` (sync; null before load), `packetsVersion` signal, and `packetsFor(topic: string): Packet[]` in `src/data/lessons/index.ts`. Follow the `qtext.ts` pattern (`import.meta.glob('./*.json')`), so the JSON becomes its own chunk.

- [ ] **Step 1: Write the failing tests** in `tests/core/checks.test.ts`: `mcq grades by index`; `match needs every row right` (`[1,0,2]` vs pairs order → false; `[0,1,2]` → true); `bucket grades every item`; `order compares the full sequence`; `numeric honours tol` (a=2.5, tol=0.05: 2.54 → true, 2.6 → false); `wrong-shaped answer is false` (array for mcq, wrong length for match).
- [ ] **Step 2:** Run `npx vitest run tests/core/checks.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `types.ts`, `checks.ts`, `index.ts`, and the two seed packets.
- [ ] **Step 4:** Run the tests. Expected: PASS. Run `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(m2): lesson types, check grading, lazy packet loader`.

### Task 2: Lesson log, concept crops, diary

**Files:**
- Modify: `src/core/state.ts`, `src/core/save.ts`, `src/core/report.ts`
- Create: `src/core/lessons.ts`
- Test: `tests/core/lessons.test.ts`, add to `tests/core/save.test.ts` and `tests/core/report.test.ts`

**Interfaces:**
- Consumes: `applyAnswer`, `cropId` from `src/core/srs.ts`; `Packet` from Task 1.
- Produces:
```ts
// state.ts
export interface LessonRun { d: string; right: number; n: number; solid: boolean; sbw: boolean; mode: 'learn' | 'water'; ts?: number }
export interface LessonLog { first: string; runs: LessonRun[]; mastered: boolean }
// SaveData gains: lessons: Record<string, LessonLog>   (defaultSave → {})
// DayLog gains:   lessons: number                       (emptyDay → 0)
// lessons.ts
export interface CheckResult { ok: boolean; conf: Confidence }
export function finishLesson(s: SaveData, p: Pick<Packet,'id'|'topic'>, results: CheckResult[], mode: 'learn'|'water', today: string, ts: number): { event: CropEvent; run: LessonRun }
export function heartsFor(s: SaveData, packetIds: string[]): number   // 0–5 = floor(5 × mastered / total)
export function learnedCount(s: SaveData, packetIds: string[]): number // packets with a log
```
Rules for `finishLesson`:
- Append the run; set `first` on the first run. `day.lessons += 1` only for `learn` runs that are the packet's first-ever run.
- `solid = results.every(r => r.ok && r.conf !== 'G')`; `sbw = results.some(r => !r.ok && r.conf === 'S')`.
- If no concept crop exists and the packet is not `mastered`, **always plant**: stage 1, due `capDue(today, 1)`, `sbw` carried. Event `'planted'`. Do this directly, because `applyAnswer` only plants on shaky answers.
- If a crop exists, call `applyAnswer(s, { kind: 'concept', ref: p.id, topic: p.topic, ok: solid, conf: solid ? 'S' : 'U', today })`. If `sbw`, set `crop.sbw = true`. When the event is `'ready'`, set `mastered = true`.
- If `mastered` and there is no crop (already harvested), record the run and return `'none'`.
- `report.ts`: the day report gains the line `Lessons: N new` when `day.lessons > 0`, plus the count of concept crops among thirsty crops. Read the existing report format and match it.

- [ ] **Step 1: Write the failing tests:** `first learn run plants a concept crop even when all correct`; `solid water run next day grows it to stage 2 (due +2)`; `same-day rerun neither grows nor duplicates` (event `'same-day'`, one crop, still stage 1); `shaky water run wilts and sets due tomorrow`; `sure-but-wrong makes the crop golden`; `reaching stage 3 marks mastered and harvest does not replant on the next learn run`; `heartsFor floors to 0–5`; `normalizes missing or bad lesson logs` (no `lessons` key → `{}`, `lessons: {x: 5}` → dropped, `DayLog` without `lessons` → 0); `report shows Lessons line`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. In `save.ts`, add a `cleanLessonLog` alongside `cleanCrop`, keeping only valid runs (`isDate(d)`, numeric `right` and `n`).
- [ ] **Step 4:** Run `npm test`. Expected: all PASS, including the old suites.
- [ ] **Step 5:** Commit `feat(m2): lesson log and concept crops`.

### Task 3: Content — every strategy & management subtopic

This task is content authoring, done by parallel subagents (one per topic, Business strategy split in two). Each subagent is then checked by a separate verifier.

**Files:**
- Modify: `src/data/lessons/strategy.json`
- Create: `tests/data/lessons.test.ts`

**Inputs for authors** (scratch only, never committed): Vol.1 extracted text (Chapter 7 is book pp. 262–308; PDF page = book page + 6), and the bank items for the subs (`why`, `trap`, `cue`, `note`, plus the question text from `src/data/questions/*.json`). Facts that aren't in the book cite the past-paper question that tests them.

**Content rules:** one packet per bank `sub` (58 subs across 5 topics; closely related subs may share one packet, e.g. `SLA availability` + `outsourcing / SLA`). Each packet has 2–4 checks, and a check must not copy the past-paper question; it tests the same idea with new wording or numbers. Calculation subs (`break-even / target profit`, `straight-line depreciation`, `EVM`, `PERT estimate`, `critical path`, `COCOMO`, `SLA availability`, `RTO / MTD`, `cost comparison`, `OC curve`) get at least one `numeric` check with a worked example showing every step. `qids` lists every bank id whose `sub` is in `subs`. Keep each packet under ~1.6 KB of JSON.

- [ ] **Step 1: Write the failing data gate** in `tests/data/lessons.test.ts`:
  - `every strategy (topic, sub) in the bank is covered`: for every bank item where `topicInfo(topic).field === 'strategy'`, some packet has that `topic` and includes that `sub`.
  - `packets are well-formed`: unique ids matching `/^(bs|ss|sm|pm|al)-[a-z0-9-]+$/`; `checks.length >= 2`; mcq `0 <= a < opts.length` and `opts.length >= 3`; match `pairs.length >= 3`; bucket `buckets.length >= 2` and every item index valid; order `steps.length >= 3`; numeric `Number.isFinite(a)`; non-empty `why` on every check.
  - `sources use the allowed forms`: every `src` matches `/^FE Prep Book Vol\.1 §7\.\d\.\d p\.\d{3}$|^\(20(25|26)[SA], FE, Subject-[AB], Q\d{1,2}\)$/`.
  - `qids are exact`: `qids` equals the sorted bank ids whose sub is in `subs`.
- [ ] **Step 2:** Run it. Expected: FAIL (2 packets only).
- [ ] **Step 3:** Dispatch the authors: Business strategy subs 1–11, Business strategy subs 12–22, System strategy, Service mgmt & audit + Accounting & legal, Project management. Each writes `src/data/lessons/_parts/<topic>.json`, and a script merges them into `strategy.json`. Delete `_parts` before committing.
- [ ] **Step 4:** Dispatch one verifier per part, with fresh context. It re-derives every check answer and every numeric worked example independently, checks each fact against the cited source, and reports every disagreement. The author agent fixes the confirmed ones. Spot-check five packets yourself.
- [ ] **Step 5:** Run `npx vitest run tests/data/lessons.test.ts`. Expected: PASS. Run `npm run build && npm run budget`: the lessons chunk is ≤ 120 KB gz.
- [ ] **Step 6:** Commit `content(m2): seed packets for all strategy & management subtopics`.

### Task 4: Check views

**Files:**
- Create: `src/ui/lesson/CheckView.tsx`, `src/ui/lesson/lesson.css`
- Test: `tests/ui/lesson.test.tsx`

**Interfaces:**
- Consumes: `Check`, `CheckAnswer`, `gradeCheck`; `parseInline` from `src/ui/paper/QuestionBody.tsx` for all text.
- Produces: `CheckView({ check, seed, locked, onChange }: { check: Check; seed: number; locked: boolean; onChange: (a: CheckAnswer | null) => void })`. `onChange(null)` means incomplete. Shuffles use `mulberry32(seed)` from `src/core/rng.ts`, so a rerender keeps the order stable.
- UI: mcq = big option buttons; match = for each left item, a row of tappable right-side chips (no drag; drag is unreliable on the A21s); bucket = per item, a segmented button per bucket; order = tap steps in order into a numbered list, with an "Undo" button; numeric = `inputmode="decimal"` input plus a unit label.

- [ ] **Step 1: Write the failing tests:** `mcq reports the picked index`; `match reports null until every row is set`; `order builds the sequence and undo removes the last`; `numeric parses '1,200.5' as 1200.5 and empty as null`; `locked disables input`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5:** Commit `feat(m2): interactive check views`.

### Task 5: Lesson panel

**Files:**
- Create: `src/ui/lesson/LessonPanel.tsx`
- Modify: `src/app/panel-types.ts` (add `{ kind: 'lesson'; id: string; mode: 'learn' | 'water' }`), `src/app/panels.tsx`
- Test: `tests/ui/lesson.test.tsx`

**Interfaces:**
- Consumes: `getPacket`/`loadPackets`, `CheckView`, `gradeCheck`, `finishLesson`, `update`, `today`, `closePanel`, `openPanel`, `sfx`/`buzz`.
- Flow, `learn` mode: Hook → Model → Worked example (steps revealed one tap at a time) → each check (answer → Sure/Unsure/Guess → **Check** button → reveal ✓/✗ + `why`) → summary. `water` mode starts directly at the checks, with a different shuffle seed per day (`seed = hash(id + today)`).
- `finishLesson` is called **once**, when the last check is revealed, never earlier. The summary shows the crop event (same wording style as `SessionSummary`), the packet's `trap` if any, `src`, and a **Practice the past-paper question(s)** button. It opens `{ kind: 'session', ids: qids filtered to exclude 2026S while save.hold is true, mode: 'practice', title }`; hide the button when the list is empty.
- While packets are loading, show "Loading lesson…". For an unknown id, show "This lesson isn't available" and a close button.

- [ ] **Step 1: Write the failing tests:** `learn flow shows hook, model, example, then checks`; `answer stays hidden until confidence and Check`; `finishing plants a concept crop and shows the summary`; `closing mid-lesson records nothing` (close after check 1 → `save.lessons` empty, no crop); `water mode skips straight to checks`; `practice button hides 2026S while hold is on`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5:** Commit `feat(m2): lesson panel with commit-before-reveal checks`.

### Task 6: Town, villager, watering concept crops

**Files:**
- Create: `src/ui/town/TownPanel.tsx`
- Modify: `src/app/panel-types.ts` (add `{ kind: 'town' }`), `src/app/panels.tsx`, `src/ui/actions.ts`, `src/ui/activities/FieldPanel.tsx`
- Test: `tests/ui/town.test.tsx`, add to `tests/ui/activities.test.tsx`

**Interfaces:**
- Consumes: `packetsFor('…')` for the 5 strategy topics, `heartsFor`, `learnedCount`, `dueCrops`.
- Town panel: a villager card for **Auntie Rosa, the market-stall keeper** (Market Garden), with a small inline SVG portrait drawn in the existing flat style, hearts ♥ 0–5, and "Learned X / N". Below it, a **Thirsty lessons** list (due concept crops, golden first). Then the packets grouped by topic, each row showing a status chip: NEW / GROWING (stage 1–2) / READY / MASTERED. Tapping a row opens the lesson (`learn` if the packet has no log, else `water` when its crop is thirsty, else `learn`). At the bottom, one muted line: "More villagers arrive with the Greenhouse, Orchard, Hedge and Code Garden lessons."
- `actions.ts`: `waterCrop(c)` for `kind === 'concept'` opens `{ kind:'lesson', id:c.ref, mode:'water' }`. If `getPacket` is null after `loadPackets()` resolves, it shows the toast `That lesson is no longer available — harvest or leave it.` instead. `waterAll()` opens the paper session when paper crops are due; otherwise it opens the first due concept lesson. The toast reports `N lesson crops are thirsty too — see Town` when both kinds are due. `waterField` does the same for its field.
- FieldPanel: for `field === 'strategy'`, add a `Lessons in Town` button.

- [ ] **Step 1: Write the failing tests:** `town lists every strategy packet grouped by topic`; `hearts and learned count reflect the save`; `thirsty lesson row opens water mode`; `unknown packet crop shows toast`; `waterAll falls back to concept lessons`; `strategy field panel links to Town`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(m2): Town with the Market Garden villager; concept watering`.

### Task 7: Town gate on the farm, budgets, e2e, ship

**Files:**
- Modify: `src/scene/layout.ts` (add `LANDMARKS.town`), `src/scene/art.tsx` (a `TownGate` symbol: two posts, an arch, and a hanging "Town" sign, ≤ 12 SVG elements), `src/scene/Farm.tsx` (a tappable gate that walks the farmer there, then opens `{kind:'town'}`, the same as the existing landmarks), `scripts/check-budget.mjs` (classify `lessons`-chunk files, limit 120 KB gz), `scripts/check-pwa.mjs` (assert one precached lessons chunk), `e2e/farm.spec.ts`, `tests/scene/layout.test.ts`
- Place the gate in the free top-strip space right of the mine, inside the world bounds. The layout test asserts that its box doesn't overlap the house, bin, calendar, mine, or any field rectangle.

- [ ] **Step 1: Write the failing tests:** layout `town gate overlaps nothing`; e2e `learns a seed packet and plants a concept crop` (open Town → first packet → step through → answer every check with Sure → summary says planted → close → the Market Garden shows one more crop); e2e `lesson fits a 360 px phone` (`document.scrollingElement.scrollWidth <= 360` on the hook and on a match check).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Verify everything: `npm run typecheck && npm test && npm run build && npm run budget && npm run check:pwa`, then `E2E_PORT=4182 npx playwright test` (with `LD_LIBRARY_PATH` set). Expected: all pass; budget line shows lessons ≤ 120 KB gz.
- [ ] **Step 5:** Commit `feat(m2): Town gate on the farm; budgets and e2e`. Merge to `main` and push, which deploys via Actions. Confirm the live `index-*.js` hash equals a local build, then run the e2e suite with `BASE_URL=https://zendrix-hub.github.io/-byte-harvest/`.
