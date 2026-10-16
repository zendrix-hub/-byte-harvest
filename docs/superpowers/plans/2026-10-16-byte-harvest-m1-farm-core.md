# Byte Harvest M1 (Farm Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable, installable farm game tonight. All 240 PhilNITS FE past-paper questions are played by fishing (Subject A) or mining (Subject B), every miss grows into a crop that has to be watered on later days, and the whole thing runs offline on a Samsung A21s from GitHub Pages.

**Architecture:** The game rules are pure TypeScript in `src/core/` (dates, save, crops/SRS, recording, practice pools, diary report, stamina). They mutate a cloned `SaveData` draft and are fully unit-tested. A small signals store (`src/app/store.ts`) owns state, persistence, the clock, the open panel, and toasts. Preact renders a code-drawn SVG farm (`src/scene/`) plus HTML panels (`src/ui/`) for every learning interaction. vite-plugin-pwa makes the app installable and offline, and GitHub Actions deploys it to Pages.

**Tech Stack:** Vite 7 · TypeScript 5.9 strict · Preact 10 + @preact/signals 2 · plain CSS · vite-plugin-pwa 1 (Workbox) · Vitest 3 + jsdom + @testing-library/preact · Playwright · GitHub Actions + Pages

**Spec:** `/home/rivazn/byte-harvest/docs/superpowers/specs/2026-10-16-byte-harvest-design.md`

## Global Constraints

- Exam (Harvest Festival): **Sun 2026-10-25**. Last review day: **2026-10-24**. Real local dates drive everything.
- Repo: `~/byte-harvest` (`/home/rivazn/byte-harvest`, Linux filesystem). Every command below runs from that folder.
- Source data (read-only): `/mnt/c/Users/riva.zn/Documents/philnits reviewer/FE_PastPaper_Dojo.html` and `.../dojo_question_bank.json`.
- Vite `base` is always `/byte-harvest/`. Pages URL: `https://zendrix-hub.github.io/byte-harvest/`. GitHub repo: `zendrix-hub/byte-harvest`.
- Stack: Vite 7, TypeScript strict (`noUnusedLocals`, `noUnusedParameters`), Preact 10 + @preact/signals 2, plain CSS, vite-plugin-pwa 1, Vitest 3, Playwright.
- In Preact SVG, write attributes in kebab-case (`stroke-width`, `text-anchor`, `stop-color`). Make tappable SVG items `<a href="#" role="button" aria-label=…>` and call `preventDefault()` in their click handlers. Preact does not convert camelCase attributes, and `tabIndex` does not work on SVG.
- Budgets: JS ≤ 120 KB gzip, CSS ≤ 20 KB gzip. No `backdrop-filter`, no SVG filters. Animate only `transform`/`opacity`. Ambient animation pauses while a panel is open or battery saver is on.
- A CSS animation's `transform` overrides an element's `transform` attribute. Always put an animated class on a child `<g>`, never on the element that carries `transform="translate(...)"`.
- Learning rules: never render the key, `why`, `trap`, `cue`, or `note` before commit. Confidence (Sure/Unsure/Guess) is required. A miss or a lucky guess plants a crop. Crops grow only on a later day: +1 day, then +2 days, then ready. Due dates are capped at 2026-10-24. A sure-but-wrong crop is golden and gets watered first. Pests K/C/N/M/T apply to misses. Pace is A 90 s, B 300 s. 2026S stays held back until its full mock is recorded for that subject.
- Storage key `byteHarvest_v1`. Bad saves never crash the app.
- Original names and art only (no Harvest Moon names or assets).
- Touch targets ≥ 44 px (farm crop cells ≈ 38 px are the one exception). No horizontal scrolling at a 360 px viewport.
- Every past-paper question shows its source label, e.g. `(2025S, FE, Subject-A, Q1)`.
- Local servers and URLs use **`127.0.0.1`, never `localhost`**. On this WSL, `localhost` resolves to `::1`, and `HTTP(S)_PROXY=http://proxy:3128` is set with `no_proxy` covering only `127.0.0.1`.
- Commits end with: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`

## Review Focus

1. **Studying past midnight.** A session that runs from 23:59 to 00:01 must date its attempts by local time and show the newly thirsty crops without a reload. Pinned in Task 3 (`localDate` rollover) and Task 8 (`today` follows the `now` signal).
2. **A corrupted or old save in localStorage.** The game loads with defaults, keeps the raw text under `byteHarvest_v1_corrupt`, and salvages the valid parts. Pinned in Task 4.
3. **Importing the same Dojo backup twice, or the wrong file.** No duplicate attempts or crops, a friendly error message, and the current farm stays untouched. Pinned in Task 4 (logic) and Task 14 (UI).
4. **A 360 px phone, tall Subject B images, up to 10 answer options.** Options wrap, there is no horizontal scroll, and the image can be zoomed. Pinned in Task 12 (10 options rendered) and Task 17 (e2e overflow check).
5. **Offline with a question image that was never cached.** A friendly message appears instead of a broken image, and the app shell still loads offline. Pinned in Task 12 (`onError` fallback) and Task 17 (offline reload).

## File Structure

```
byte-harvest/
├── index.html                      # app shell, icons, %BASE_URL%
├── package.json · tsconfig.json · vite.config.ts · playwright.config.ts · .gitignore · README.md
├── .github/workflows/deploy.yml    # test → build → budget → Pages
├── scripts/
│   ├── extract-dojo.mjs            # Dojo HTML/JSON → src/data/bank.json + public/papers/*.webp
│   ├── make-icons.mjs              # logo.svg → PWA PNG icons (Playwright)
│   ├── check-budget.mjs            # gzip size gate
│   └── check-pwa.mjs               # dist sanity gate
├── public/
│   ├── papers/<id>.webp            # 240 question images (generated, committed)
│   └── icons/                      # logo.svg + generated PNGs
├── src/
│   ├── main.tsx                    # font, SW registration, render
│   ├── data/                       # static content (no state)
│   │   ├── types.ts                # BankQuestion, Subject, FieldId, CropKind…
│   │   ├── bank.json · bank.ts     # questions + id helpers
│   │   ├── topics.ts               # topic → field + crop
│   │   └── plan.ts                 # Oct 16–25 almanac
│   ├── core/                       # pure game rules (unit-tested)
│   │   ├── dates.ts · rng.ts · state.ts · save.ts
│   │   ├── economy.ts · srs.ts     # gold, pests, crop growth
│   │   ├── record.ts · practice.ts # answering + pools
│   │   ├── report.ts · stamina.ts  # diary + focus timer
│   ├── app/                        # runtime glue
│   │   ├── store.ts                # signals: save, now, today, panel, toast
│   │   ├── panel-types.ts · panels.tsx · App.tsx
│   │   ├── feedback.ts             # synth sounds + vibration
│   │   ├── clipboard.ts · offline.ts
│   │   └── staminaStore.ts
│   ├── scene/                      # SVG farm
│   │   ├── art.tsx                 # all drawn art + crop defs
│   │   ├── layout.ts               # world + field geometry
│   │   ├── useWalker.ts · Farm.tsx · scene.css
│   ├── ui/                         # HTML panels + widgets
│   │   ├── kit.tsx · icons.tsx · actions.ts
│   │   ├── Hud.tsx · StaminaBar.tsx · RestOverlay.tsx · Almanac.tsx
│   │   ├── paper/ PaperQuestion.tsx · PestPicker.tsx · ImageZoom.tsx · Session.tsx · paper.css
│   │   ├── activities/ PracticePanel.tsx · FieldPanel.tsx · activities.css
│   │   └── house/ HousePanel.tsx · house.css
│   └── styles/base.css
├── tests/                          # Vitest (mirrors src/)
└── e2e/farm.spec.ts                # Playwright, 360×800 + 1366×768
```

## One-time machine setup (the user runs this once, before Task 10)

Headless Chromium (used for screenshots in Task 10, icons in Task 16, and e2e tests in Tasks 17–18) needs three system libraries that this WSL (Ubuntu 26.04) doesn't have. The user runs this in the Claude Code prompt:
```
! sudo apt-get install -y libnspr4 libnss3 libasound2t64
```
Verify: `npx playwright install chromium && ldd ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | grep "not found"` should print nothing.

Fallback if sudo isn't available. This extracts the libraries locally; export the variable in every shell that runs Playwright:
```bash
mkdir -p ~/.cache/bh-pwlibs/debs && cd ~/.cache/bh-pwlibs/debs
apt-get download libnspr4 libnss3 libasound2t64
for d in *.deb; do dpkg -x "$d" ../root; done
export LD_LIBRARY_PATH="$HOME/.cache/bh-pwlibs/root/usr/lib/x86_64-linux-gnu"
```

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/app/App.tsx`, `tests/setup.ts`, `tests/smoke.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` (Vitest + jsdom + Testing Library, globals on), `npm run typecheck`, `npm run build`; `App()` component in `src/app/App.tsx` (rewritten in Task 8).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "byte-harvest",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "extract": "node scripts/extract-dojo.mjs",
    "icons": "node scripts/make-icons.mjs",
    "budget": "node scripts/check-budget.mjs",
    "check:pwa": "node scripts/check-pwa.mjs",
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd ~/byte-harvest
npm install preact@^10 @preact/signals@^2 @fontsource-variable/nunito@^5
npm install -D vite@^7 @preact/preset-vite@^2 typescript@~5.9 @types/node@^24 vitest@^3 jsdom@^26 @testing-library/preact@^3 @testing-library/jest-dom@^6 vite-plugin-pwa@^1 @playwright/test@^1
```
Expected: both installs finish with no `ERESOLVE` error. If npm reports a peer-range conflict for `vite@7`, run the same command again with `--legacy-peer-deps` and continue.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "vitest/globals", "vite-plugin-pwa/client", "node"]
  },
  "include": ["src", "tests", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/byte-harvest/',
  plugins: [preact({ prefreshEnabled: !process.env.VITEST })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: Write `index.html` and `.gitignore`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#3a9a5b" />
    <meta name="description" content="Byte Harvest — a cozy farm game for PhilNITS FE review" />
    <title>Byte Harvest</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
dev-dist
test-results
playwright-report
*.log
.DS_Store
```

- [ ] **Step 6: Write the failing smoke test**

`tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`tests/smoke.test.tsx`:
```tsx
import { render, screen } from '@testing-library/preact';
import { App } from '../src/app/App';

describe('scaffold', () => {
  it('renders the game title', () => {
    render(<App />);
    expect(screen.getByText('Byte Harvest')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `cd ~/byte-harvest && npx vitest run tests/smoke.test.tsx`
Expected: FAIL with `Failed to resolve import "../src/app/App"`.

- [ ] **Step 8: Write the minimal app**

`src/app/App.tsx`:
```tsx
export function App() {
  return <h1>Byte Harvest</h1>;
}
```

`src/main.tsx`:
```tsx
import { render } from 'preact';
import { App } from './app/App';

render(<App />, document.getElementById('app')!);
```

- [ ] **Step 9: Run tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: `1 passed`; tsc prints nothing and exits 0.

- [ ] **Step 10: Commit (includes the spec and this plan)**

```bash
cd ~/byte-harvest
git init -b main
git add -A
git commit -m "chore: scaffold Byte Harvest (Vite + Preact + Vitest)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Import the question bank, images, and topic map

**Files:**
- Create: `scripts/extract-dojo.mjs`, `src/data/types.ts`, `src/data/bank.ts`, `src/data/topics.ts`, `tests/data/bank.test.ts`, `tests/data/topics.test.ts`
- Generated (committed): `src/data/bank.json`, `public/papers/<id>.webp` × 240

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts`: `Subject = 'A'|'B'`, `PaperId = '2025S'|'2025A'|'2026S'`, `OptionLetter = 'a'…'j'`, `Confidence = 'S'|'U'|'G'`, `ErrorTag = 'K'|'C'|'N'|'M'|'T'`, `BankQuestion {id,key,agree,topic,sub,nopt,diff,why,trap,cue?,note?}`, `FieldId = 'strategy'|'tech'|'security'|'devdb'|'code'`, `CropKind` (21 names), `TopicInfo {field, crop}`.
  - `bank.ts`: `BANK: BankQuestion[]`, `byId: Record<string, BankQuestion>`, `LETTERS: OptionLetter[]`, `PAPERS: Record<PaperId,string>`, `HOLD_PAPER: PaperId`, `PACE_SECONDS: Record<Subject,number>`, `paperOf(id)`, `subjectOf(id)`, `numberOf(id)`, `sourceLabel(id)`, `optionCount(q)`, `imageUrl(id)`.
  - `topics.ts`: `FieldInfo {id,name,blurb}`, `FIELDS: FieldInfo[]`, `TOPICS: Record<string, TopicInfo>`, `CROP_NAMES: Record<CropKind,string>`, `topicInfo(topic)`, `fieldInfo(id)`, `topicsInField(id): string[]`.

- [ ] **Step 1: Write the failing tests**

`tests/data/bank.test.ts`:
```ts
import { existsSync } from 'node:fs';
import { BANK, byId, imageUrl, numberOf, optionCount, paperOf, sourceLabel, subjectOf } from '../../src/data/bank';

describe('question bank', () => {
  it('holds 240 questions: 60 A + 20 B per paper', () => {
    expect(BANK).toHaveLength(240);
    for (const p of ['2025S', '2025A', '2026S']) {
      expect(BANK.filter((q) => q.id.startsWith(`${p}_A_`))).toHaveLength(60);
      expect(BANK.filter((q) => q.id.startsWith(`${p}_B_`))).toHaveLength(20);
    }
  });

  it('has an extracted image for every question', () => {
    for (const q of BANK) expect(existsSync(`public/papers/${q.id}.webp`), q.id).toBe(true);
  });

  it('parses ids into paper, subject, number and a source label', () => {
    expect(paperOf('2025A_B_Q07')).toBe('2025A');
    expect(subjectOf('2025A_B_Q07')).toBe('B');
    expect(numberOf('2025A_B_Q07')).toBe(7);
    expect(sourceLabel('2025S_A_Q01')).toBe('(2025S, FE, Subject-A, Q1)');
  });

  it('always offers at least as many options as the key letter needs', () => {
    expect(optionCount(byId['2025A_B_Q10'])).toBe(10);
    for (const q of BANK) expect(optionCount(q)).toBeGreaterThanOrEqual('abcdefghij'.indexOf(q.key) + 1);
  });

  it('builds image urls under the app base path', () => {
    expect(imageUrl('2025S_A_Q01')).toBe('/byte-harvest/papers/2025S_A_Q01.webp');
  });
});
```

`tests/data/topics.test.ts`:
```ts
import { BANK } from '../../src/data/bank';
import { FIELDS, TOPICS, fieldInfo, topicInfo, topicsInField } from '../../src/data/topics';

describe('topics → farm fields', () => {
  it('maps every bank topic to a field and crop', () => {
    for (const q of BANK) expect(TOPICS[q.topic], q.topic).toBeDefined();
  });

  it('gives every topic its own crop', () => {
    const crops = Object.values(TOPICS).map((t) => t.crop);
    expect(new Set(crops).size).toBe(crops.length);
  });

  it('puts at least one topic in every field', () => {
    for (const f of FIELDS) expect(topicsInField(f.id).length, f.id).toBeGreaterThan(0);
  });

  it('lists strategy & management first (largest share of Subject A)', () => {
    expect(FIELDS[0].id).toBe('strategy');
    expect(topicsInField('strategy')).toEqual([
      'Business strategy',
      'System strategy',
      'Service mgmt & audit',
      'Project management',
      'Accounting & legal',
    ]);
  });

  it('falls back safely for unknown topics', () => {
    expect(topicInfo('Nope').field).toBe('tech');
    expect(fieldInfo('code').name).toBe('Code Garden');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/data`
Expected: FAIL with `Failed to resolve import "../../src/data/bank"`.

- [ ] **Step 3: Write and run the extraction script**

`scripts/extract-dojo.mjs`:
```js
// Usage: node scripts/extract-dojo.mjs [dojo.html] [dojo_question_bank.json]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = '/mnt/c/Users/riva.zn/Documents/philnits reviewer';
const htmlPath = process.argv[2] ?? join(SRC, 'FE_PastPaper_Dojo.html');
const bankPath = process.argv[3] ?? join(SRC, 'dojo_question_bank.json');

const html = readFileSync(htmlPath, 'utf8');
const match = html.match(/const IMG = (\{.*?\});\n/s);
if (!match) throw new Error(`IMG map not found in ${htmlPath}`);
const images = JSON.parse(match[1]);
const bank = JSON.parse(readFileSync(bankPath, 'utf8'));

const outDir = join(root, 'public', 'papers');
mkdirSync(outDir, { recursive: true });
let bytes = 0;
for (const q of bank) {
  const uri = images[q.id];
  if (!uri) throw new Error(`Missing image for ${q.id}`);
  const buf = Buffer.from(uri.split(',', 2)[1], 'base64');
  bytes += buf.length;
  writeFileSync(join(outDir, `${q.id}.webp`), buf);
}
mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'bank.json'), JSON.stringify(bank, null, 1) + '\n');
console.log(`Extracted ${bank.length} questions and ${Math.round(bytes / 1024)} KB of images into public/papers/`);
```

Run: `cd ~/byte-harvest && npm run extract`
Expected: `Extracted 240 questions and 7345 KB of images into public/papers/` (the KB figure may differ by a few).

- [ ] **Step 4: Write the data modules**

`src/data/types.ts`:
```ts
export type Subject = 'A' | 'B';
export type PaperId = '2025S' | '2025A' | '2026S';
export type OptionLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';
export type Confidence = 'S' | 'U' | 'G';
export type ErrorTag = 'K' | 'C' | 'N' | 'M' | 'T';

export interface BankQuestion {
  id: string;
  key: OptionLetter;
  agree: boolean;
  topic: string;
  sub: string;
  nopt: number;
  diff: number;
  why: string;
  trap: string;
  cue?: string;
  note?: string;
}

export type FieldId = 'strategy' | 'tech' | 'security' | 'devdb' | 'code';

export type CropKind =
  | 'sunflower' | 'corn' | 'cabbage' | 'pumpkin' | 'wheat'
  | 'tomato' | 'eggplant' | 'potato' | 'grape' | 'carrot' | 'strawberry' | 'pepper'
  | 'rose' | 'turnip' | 'onion'
  | 'pea' | 'melon' | 'blueberry' | 'mushroom' | 'radish' | 'bean';

export interface TopicInfo {
  field: FieldId;
  crop: CropKind;
}
```

`src/data/bank.ts`:
```ts
import raw from './bank.json';
import type { BankQuestion, OptionLetter, PaperId, Subject } from './types';

export const BANK = raw as unknown as BankQuestion[];
export const byId: Record<string, BankQuestion> = Object.fromEntries(BANK.map((q) => [q.id, q]));
export const LETTERS: OptionLetter[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
export const PAPERS: Record<PaperId, string> = { '2025S': 'Apr 2025', '2025A': 'Oct 2025', '2026S': 'Apr 2026' };
export const HOLD_PAPER: PaperId = '2026S';
export const PACE_SECONDS: Record<Subject, number> = { A: 90, B: 300 };

export const paperOf = (id: string) => id.split('_')[0] as PaperId;
export const subjectOf = (id: string) => id.split('_')[1] as Subject;
export const numberOf = (id: string) => parseInt(id.split('_')[2].slice(1), 10);
export const sourceLabel = (id: string) => `(${paperOf(id)}, FE, Subject-${subjectOf(id)}, Q${numberOf(id)})`;
export const optionCount = (q: BankQuestion) => Math.max(q.nopt, LETTERS.indexOf(q.key) + 1);
export const imageUrl = (id: string) => `${import.meta.env.BASE_URL}papers/${id}.webp`;
```

`src/data/topics.ts`:
```ts
import type { CropKind, FieldId, TopicInfo } from './types';

export interface FieldInfo {
  id: FieldId;
  name: string;
  blurb: string;
}

export const FIELDS: FieldInfo[] = [
  { id: 'strategy', name: 'Market Garden', blurb: 'Strategy & management · about a third of Subject A in the real papers' },
  { id: 'tech', name: 'Tech Orchard', blurb: 'Hardware, OS, network, numbers & logic, algorithms' },
  { id: 'security', name: 'Thorn Hedge', blurb: 'Security · Subject A plus 4 Subject B questions' },
  { id: 'devdb', name: 'Greenhouse', blurb: 'Development & database' },
  { id: 'code', name: 'Code Garden', blurb: 'Subject B programming (16 of 20 questions)' },
];

export const TOPICS: Record<string, TopicInfo> = {
  'Business strategy': { field: 'strategy', crop: 'sunflower' },
  'System strategy': { field: 'strategy', crop: 'corn' },
  'Service mgmt & audit': { field: 'strategy', crop: 'cabbage' },
  'Project management': { field: 'strategy', crop: 'pumpkin' },
  'Accounting & legal': { field: 'strategy', crop: 'wheat' },
  'Hardware & CPU': { field: 'tech', crop: 'tomato' },
  'OS & software': { field: 'tech', crop: 'eggplant' },
  'System config & reliability': { field: 'tech', crop: 'potato' },
  Network: { field: 'tech', crop: 'grape' },
  'Number & logic': { field: 'tech', crop: 'carrot' },
  'Math & statistics': { field: 'tech', crop: 'strawberry' },
  'Algorithms & data structures': { field: 'tech', crop: 'pepper' },
  Security: { field: 'security', crop: 'rose' },
  Development: { field: 'devdb', crop: 'turnip' },
  Database: { field: 'devdb', crop: 'onion' },
  'Arrays & loops': { field: 'code', crop: 'pea' },
  'Data structures': { field: 'code', crop: 'melon' },
  'Math & bits': { field: 'code', crop: 'blueberry' },
  Recursion: { field: 'code', crop: 'mushroom' },
  'Sorting & searching': { field: 'code', crop: 'radish' },
  Strings: { field: 'code', crop: 'bean' },
};

export const CROP_NAMES: Record<CropKind, string> = {
  sunflower: 'sunflower', corn: 'corn', cabbage: 'cabbage', pumpkin: 'pumpkin', wheat: 'wheat',
  tomato: 'tomato', eggplant: 'eggplant', potato: 'potato', grape: 'grape vine', carrot: 'carrot',
  strawberry: 'strawberry', pepper: 'pepper', rose: 'thorn rose', turnip: 'turnip', onion: 'onion',
  pea: 'pea pod', melon: 'melon', blueberry: 'blueberry', mushroom: 'mushroom', radish: 'radish', bean: 'string bean',
};

const FALLBACK: TopicInfo = { field: 'tech', crop: 'turnip' };

export const topicInfo = (topic: string): TopicInfo => TOPICS[topic] ?? FALLBACK;
export const fieldInfo = (id: FieldId): FieldInfo => FIELDS.find((f) => f.id === id) ?? FIELDS[0];
export const topicsInField = (id: FieldId): string[] => Object.keys(TOPICS).filter((t) => TOPICS[t].field === id);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ~/byte-harvest && npx vitest run tests/data && npm run typecheck`
Expected: `10 passed`, tsc exit 0.

- [ ] **Step 6: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: import the 240-question bank, images and topic→field map

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Dates and the 10-day almanac

**Files:**
- Create: `src/core/dates.ts`, `src/data/plan.ts`, `tests/core/dates.test.ts`, `tests/data/plan.test.ts`

**Interfaces:**
- Consumes: `Subject` from `src/data/types.ts`.
- Produces:
  - `dates.ts`: `EXAM_DATE = '2026-10-25'`, `LAST_REVIEW_DAY = '2026-10-24'`, `localDate(now?: Date): string`, `addDays(date, n): string`, `daysBetween(a, b): number` (b − a), `daysToExam(today): number`, `capDue(today, gapDays): string`, `formatDay(date): string` ("Fri Oct 16"), `fmtClock(secs): string` ("1:35").
  - `plan.ts`: `Suggestion` (union: `{label, kind:'water'}` | `{label, kind:'practice', subject, area?}` | `{label, kind:'house'}`), `PlanDay {date,title,focus,tasks,suggest,mood:'study'|'mock'|'rest'|'exam'}`, `PLAN: PlanDay[]`, `planFor(date): PlanDay`.

- [ ] **Step 1: Write the failing tests**

`tests/core/dates.test.ts`:
```ts
import { addDays, capDue, daysBetween, daysToExam, fmtClock, formatDay, localDate } from '../../src/core/dates';

describe('dates', () => {
  it('uses the local calendar day and rolls over at local midnight', () => {
    expect(localDate(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16');
    expect(localDate(new Date(2026, 9, 17, 0, 1))).toBe('2026-10-17');
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-16', -1)).toBe('2026-10-15');
  });

  it('counts days to the exam', () => {
    expect(daysBetween('2026-10-16', '2026-10-25')).toBe(9);
    expect(daysToExam('2026-10-16')).toBe(9);
    expect(daysToExam('2026-10-25')).toBe(0);
  });

  it('caps due dates at the last review day but never re-schedules today', () => {
    expect(capDue('2026-10-16', 2)).toBe('2026-10-18');
    expect(capDue('2026-10-23', 2)).toBe('2026-10-24');
    expect(capDue('2026-10-24', 1)).toBe('2026-10-25');
  });

  it('formats days and clocks', () => {
    expect(formatDay('2026-10-16')).toBe('Fri Oct 16');
    expect(formatDay('2026-10-25')).toBe('Sun Oct 25');
    expect(fmtClock(95)).toBe('1:35');
  });
});
```

`tests/data/plan.test.ts`:
```ts
import { addDays } from '../../src/core/dates';
import { PLAN, planFor } from '../../src/data/plan';

describe('study almanac', () => {
  it('covers Oct 16 to the Oct 25 exam, one entry per day', () => {
    expect(PLAN[0].date).toBe('2026-10-16');
    expect(PLAN[PLAN.length - 1].date).toBe('2026-10-25');
    PLAN.forEach((p, i) => {
      if (i > 0) expect(p.date).toBe(addDays(PLAN[i - 1].date, 1));
    });
  });

  it('finds the plan for a date and clamps outside the range', () => {
    expect(planFor('2026-10-16').title).toBe('Management blitz');
    expect(planFor('2026-10-17').mood).toBe('mock');
    expect(planFor('2026-10-01').date).toBe('2026-10-16');
    expect(planFor('2026-11-02').mood).toBe('exam');
  });

  it('marks the rest day and the exam day', () => {
    expect(planFor('2026-10-24').mood).toBe('rest');
    expect(planFor('2026-10-25').mood).toBe('exam');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/core/dates.test.ts tests/data/plan.test.ts`
Expected: FAIL with `Failed to resolve import "../../src/core/dates"`.

- [ ] **Step 3: Write `src/core/dates.ts`**

```ts
export const EXAM_DATE = '2026-10-25';
export const LAST_REVIEW_DAY = '2026-10-24';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function utc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The player's local calendar day as YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: string, n: number): string {
  return new Date(utc(date) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export const daysToExam = (today: string) => daysBetween(today, EXAM_DATE);

/** today + gap, pulled back to the last review day, but never onto today itself. */
export function capDue(today: string, gapDays: number): string {
  const due = addDays(today, gapDays);
  if (due > LAST_REVIEW_DAY && today < LAST_REVIEW_DAY) return LAST_REVIEW_DAY;
  return due;
}

export function formatDay(date: string): string {
  const d = new Date(utc(date));
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export const fmtClock = (secs: number) => `${Math.floor(secs / 60)}:${pad(secs % 60)}`;
```

- [ ] **Step 4: Write `src/data/plan.ts`**

```ts
import type { Subject } from './types';

export type Suggestion =
  | { label: string; kind: 'water' }
  | { label: string; kind: 'practice'; subject: Subject; area?: string }
  | { label: string; kind: 'house' };

export interface PlanDay {
  date: string;
  title: string;
  focus: string;
  tasks: string[];
  suggest: Suggestion[];
  mood: 'study' | 'mock' | 'rest' | 'exam';
}

const WATER: Suggestion = { label: 'Water crops', kind: 'water' };

export const PLAN: PlanDay[] = [
  {
    date: '2026-10-16', title: 'Management blitz', mood: 'study',
    focus: 'EVM, critical path, SLA availability, audit, depreciation, licensing',
    tasks: [
      'Water every thirsty crop first',
      'Fish 2 sets in the Market Garden (strategy & management) from 2025S/2025A',
      'Pick a pest for every miss',
      'Sleep in the House, then paste the diary into the reviewer chat',
    ],
    suggest: [WATER, { label: 'Fish: strategy & management', kind: 'practice', subject: 'A', area: 'strategy' }],
  },
  {
    date: '2026-10-17', title: 'Mock day', mood: 'mock',
    focus: 'Full mock: 2026S Subject A (90 min) → 45–60 min break → 2026S Subject B (100 min)',
    tasks: [
      'Take both mocks in FE_PastPaper_Dojo.html → Timed mock',
      'Rate your confidence on every answer',
      'Dojo → Progress → Export backup, then House → Import here: your misses become crops',
    ],
    suggest: [{ label: 'Import Dojo backup', kind: 'house' }],
  },
  {
    date: '2026-10-18', title: 'Mock review', mood: 'study',
    focus: 'Water every mock miss and tag each pest',
    tasks: ['Water all thirsty crops (golden ones first)', 'For each miss: read why + trap, then pick the pest', 'Copy the diary for Monday'],
    suggest: [WATER],
  },
  {
    date: '2026-10-19', title: 'Re-teach the top 3', mood: 'study',
    focus: 'Your three weakest topics (House → Diary → Weak topics)',
    tasks: ['Reviewer chat: re-teach the top 3 missed ideas', 'Fish one set per weak topic', 'Water crops'],
    suggest: [WATER, { label: 'Fish: all topics', kind: 'practice', subject: 'A' }],
  },
  {
    date: '2026-10-20', title: 'Development + Database', mood: 'study',
    focus: 'UML, testing, coverage · normalization, dependencies, GROUP BY/HAVING',
    tasks: ['Water crops', 'Fish 2 sets in the Greenhouse', 'Tag every pest'],
    suggest: [WATER, { label: 'Fish: Greenhouse', kind: 'practice', subject: 'A', area: 'devdb' }],
  },
  {
    date: '2026-10-21', title: 'Subject B speed', mood: 'study',
    focus: 'Data structures + recursion; trace on scrap paper',
    tasks: ['Water crops', 'Mine 2 sets: data structures, recursion', 'Bail out of a trace after ~7 minutes'],
    suggest: [WATER, { label: 'Mine: data structures', kind: 'practice', subject: 'B', area: 'Data structures' }],
  },
  {
    date: '2026-10-22', title: 'Yellow sweep', mood: 'study',
    focus: "Two's complement, subnetting, units, cache/paging · last day of new content",
    tasks: ['Water crops', 'Fish a Tech Orchard set', 'One mixed set'],
    suggest: [WATER, { label: 'Fish: Tech Orchard', kind: 'practice', subject: 'A', area: 'tech' }],
  },
  {
    date: '2026-10-23', title: 'Top 20 + pacing', mood: 'study',
    focus: 'Top 20 missed ideas · pacing strategy · exam checklist · review only',
    tasks: ['Water every crop', 'Read your pest list (House → Diary)', 'No new topics today'],
    suggest: [WATER],
  },
  {
    date: '2026-10-24', title: 'Rest day', mood: 'rest',
    focus: 'Rest. Pencils, eraser, admission card. Sleep early.',
    tasks: ['A light look at golden crops only if you want', 'Pack pencils, eraser, admission card and ID', 'Sleep early'],
    suggest: [],
  },
  {
    date: '2026-10-25', title: 'Harvest Festival — exam day', mood: 'exam',
    focus: 'Answer every question. Flag after ~2 min (A) or ~6 min (B). Blanks score zero.',
    tasks: ['Eat breakfast', 'Bubble in batches of 10', 'Answer everything'],
    suggest: [],
  },
];

export function planFor(date: string): PlanDay {
  if (date <= PLAN[0].date) return PLAN[0];
  const last = PLAN[PLAN.length - 1];
  if (date >= last.date) return last;
  return PLAN.find((p) => p.date === date) ?? PLAN[0];
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ~/byte-harvest && npx vitest run tests/core/dates.test.ts tests/data/plan.test.ts && npm run typecheck`
Expected: `8 passed`, tsc exit 0.

- [ ] **Step 6: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: local-date helpers and the Oct 16–25 almanac

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Save data: defaults, safe loading, backups, Dojo import

**Files:**
- Create: `src/core/state.ts`, `src/core/save.ts`, `tests/helpers.ts`, `tests/core/save.test.ts`

**Interfaces:**
- Consumes: `byId` (Task 2), `LAST_REVIEW_DAY` (Task 3), types from `src/data/types.ts`.
- Produces:
  - `state.ts`: `AttemptMode = 'practice'|'review'|'mock'|'lesson'`; `Attempt {d,p,ok,c,t,tag,cue,m,ts?}`; `CropSource = 'paper'|'concept'`; `Stage = 1|2|3`; `Crop {id,kind,ref,topic,stage,due,last,plantedOn,sbw,pest}`; `DayLog {answered,correct,planted,harvested,goldEarned,focusMin}`; `MockRecord {d,name,paper,subj,full,score,n,pct}`; `Settings {sound,haptics,batterySaver}`; `SaveData {v:1,farmer,att,crops,harvested,gold,days,mocks,hold,settings,seenAlmanac}`; `emptyDay()`, `ensureDay(s, date): DayLog`, `cloneSave(s): SaveData`.
  - `save.ts`: `SAVE_KEY = 'byteHarvest_v1'`, `CORRUPT_KEY = 'byteHarvest_v1_corrupt'`, `defaultSave()`, `normalizeSave(raw: unknown): SaveData`, `loadSave(storage: Storage | null): SaveData`, `persistSave(storage, s): boolean`, `exportSave(s, now: Date): string`, `ImportResult` (`{ok:true, kind:'game'|'dojo', save, summary}` | `{ok:false, error}`), `importBackup(current, text, today): ImportResult` (pure; never mutates `current`).
  - `tests/helpers.ts`: `makeSave(patch?)`, `makeCrop(p)`, `memoryStorage(opts?)`, used by later tasks' tests.

- [ ] **Step 1: Write the test helpers**

`tests/helpers.ts`:
```ts
import { defaultSave } from '../src/core/save';
import type { Crop, SaveData } from '../src/core/state';

export function makeSave(patch: Partial<SaveData> = {}): SaveData {
  return { ...defaultSave(), ...patch };
}

export function makeCrop(p: Partial<Crop> & { ref: string; topic: string }): Crop {
  return {
    id: `paper:${p.ref}`,
    kind: 'paper',
    stage: 1,
    due: '2026-10-17',
    last: '2026-10-16',
    plantedOn: '2026-10-16',
    sbw: false,
    pest: null,
    ...p,
  };
}

export function memoryStorage(opts: { throwOnGet?: boolean; throwOnSet?: boolean } = {}): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => {
      if (opts.throwOnGet) throw new Error('storage blocked');
      return m.get(k) ?? null;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => {
      m.delete(k);
    },
    setItem: (k: string, v: string) => {
      if (opts.throwOnSet) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
  };
}
```

- [ ] **Step 2: Write the failing tests**

`tests/core/save.test.ts`:
```ts
import {
  CORRUPT_KEY,
  SAVE_KEY,
  defaultSave,
  exportSave,
  importBackup,
  loadSave,
  normalizeSave,
  persistSave,
} from '../../src/core/save';
import { memoryStorage } from '../helpers';

const dojoBackup = {
  att: {
    '2025S_A_Q01': [{ d: '2026-10-14', p: 'c', ok: false, c: 'S', t: 70, tag: 'K', cue: '', m: 'practice' }],
    '2025S_A_Q03': [
      { d: '2026-10-13', p: 'a', ok: false, c: 'U', t: 50, tag: null, cue: '', m: 'practice' },
      { d: '2026-10-14', p: 'b', ok: true, c: 'S', t: 40, tag: null, cue: '', m: 'review' },
    ],
  },
  rev: {
    '2025S_A_Q01': { due: '2026-10-15', step: 0, clean: 0, last: '2026-10-14', sbw: true },
    '2025S_A_Q03': { due: '2026-10-30', step: 1, clean: 1, last: '2026-10-14', sbw: false },
  },
  log: [],
  mocks: [{ d: '2026-10-17', name: '2026S Subject A', paper: '2026S', subj: 'A', full: true, score: 40, n: 60, pct: 67 }],
  hold: true,
  active: null,
};

describe('loading saves', () => {
  it('starts fresh when nothing is stored', () => {
    expect(loadSave(memoryStorage())).toEqual(defaultSave());
  });

  it('survives corrupted JSON and keeps the raw text for rescue', () => {
    const st = memoryStorage();
    st.setItem(SAVE_KEY, '{"gold": 12, oops');
    expect(loadSave(st)).toEqual(defaultSave());
    expect(st.getItem(CORRUPT_KEY)).toBe('{"gold": 12, oops');
  });

  it('salvages the valid parts of an old or partial save', () => {
    const st = memoryStorage();
    st.setItem(
      SAVE_KEY,
      JSON.stringify({
        gold: 30,
        farmer: 'Zen',
        att: { '2025S_A_Q01': [{ d: '2026-10-15', p: 'a', ok: true }, { bad: 1 }] },
        crops: { x: { nope: true } },
        settings: { sound: false },
      }),
    );
    const s = loadSave(st);
    expect(s.gold).toBe(30);
    expect(s.farmer).toBe('Zen');
    expect(s.att['2025S_A_Q01']).toHaveLength(1);
    expect(s.crops).toEqual({});
    expect(s.settings).toEqual({ sound: false, haptics: true, batterySaver: false });
  });

  it('returns defaults when storage is blocked', () => {
    expect(loadSave(memoryStorage({ throwOnGet: true }))).toEqual(defaultSave());
  });

  it('reports a failed write instead of throwing', () => {
    expect(persistSave(memoryStorage({ throwOnSet: true }), defaultSave())).toBe(false);
    expect(persistSave(memoryStorage(), defaultSave())).toBe(true);
    expect(persistSave(null, defaultSave())).toBe(false);
  });
});

describe('backups', () => {
  it('round-trips a game backup', () => {
    const s = { ...defaultSave(), gold: 77, farmer: 'Zen' };
    const r = importBackup(defaultSave(), exportSave(s, new Date('2026-10-16T12:00:00Z')), '2026-10-16');
    expect(r.ok && r.kind).toBe('game');
    if (r.ok) expect(r.save).toEqual(normalizeSave(s));
  });

  it('rejects files that are not JSON or not a backup, leaving the farm untouched', () => {
    const cur = { ...defaultSave(), gold: 5 };
    expect(importBackup(cur, 'not json', '2026-10-16')).toEqual({ ok: false, error: "That file isn't valid JSON." });
    expect(importBackup(cur, '{"hello": 1}', '2026-10-16')).toEqual({
      ok: false,
      error: "That file isn't a Byte Harvest or Dojo backup.",
    });
    expect(cur.gold).toBe(5);
  });

  it('turns a Dojo backup into attempts, crops and mocks', () => {
    const r = importBackup(defaultSave(), JSON.stringify(dojoBackup), '2026-10-16');
    expect(r.ok && r.kind).toBe('dojo');
    if (!r.ok) return;
    expect(r.save.att['2025S_A_Q03']).toHaveLength(2);
    expect(r.save.crops['paper:2025S_A_Q01']).toMatchObject({ stage: 1, due: '2026-10-15', sbw: true, pest: 'K', topic: 'Number & logic' });
    expect(r.save.crops['paper:2025S_A_Q03']).toMatchObject({ stage: 2, due: '2026-10-24' });
    expect(r.save.mocks).toHaveLength(1);
    expect(r.summary).toBe('Dojo import: 3 answers, 2 crops planted, 1 mock.');
  });

  it('imports the same Dojo backup twice without duplicates', () => {
    const once = importBackup(defaultSave(), JSON.stringify(dojoBackup), '2026-10-16');
    if (!once.ok) throw new Error('first import failed');
    const twice = importBackup(once.save, JSON.stringify(dojoBackup), '2026-10-16');
    if (!twice.ok) throw new Error('second import failed');
    expect(twice.save).toEqual(once.save);
    expect(twice.summary).toBe('Dojo import: 0 answers, 0 crops planted, 0 mocks.');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/core/save.test.ts`
Expected: FAIL with `Failed to resolve import "../src/core/save"`.

- [ ] **Step 4: Write `src/core/state.ts`**

```ts
import type { Confidence, ErrorTag, PaperId, Subject } from '../data/types';

export type AttemptMode = 'practice' | 'review' | 'mock' | 'lesson';

export interface Attempt {
  d: string; // local date YYYY-MM-DD
  p: string; // picked letter, '-' when blank
  ok: boolean;
  c: Confidence | null;
  t: number | null; // seconds spent
  tag: ErrorTag | null;
  cue: string;
  m: AttemptMode;
  ts?: number; // epoch ms (game attempts only; Dojo attempts have none)
}

export type CropSource = 'paper' | 'concept';
export type Stage = 1 | 2 | 3;

export interface Crop {
  id: string; // `${kind}:${ref}`
  kind: CropSource;
  ref: string; // question id (or concept id from M2)
  topic: string; // bank topic name
  stage: Stage; // 3 = ready to harvest
  due: string; // next watering day (ignored at stage 3)
  last: string; // day of the last planting / growth / wilt
  plantedOn: string;
  sbw: boolean; // ever sure-but-wrong → golden
  pest: ErrorTag | null;
}

export interface DayLog {
  answered: number;
  correct: number;
  planted: number;
  harvested: number;
  goldEarned: number;
  focusMin: number;
}

export interface MockRecord {
  d: string;
  name: string;
  paper: PaperId;
  subj: Subject;
  full: boolean;
  score: number;
  n: number;
  pct: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  batterySaver: boolean;
}

export interface SaveData {
  v: 1;
  farmer: string;
  att: Record<string, Attempt[]>;
  crops: Record<string, Crop>;
  harvested: Record<string, number>;
  gold: number;
  days: Record<string, DayLog>;
  mocks: MockRecord[];
  hold: boolean;
  settings: Settings;
  seenAlmanac: string;
}

export const emptyDay = (): DayLog => ({ answered: 0, correct: 0, planted: 0, harvested: 0, goldEarned: 0, focusMin: 0 });

export const ensureDay = (s: SaveData, date: string): DayLog => (s.days[date] ??= emptyDay());

export const cloneSave = (s: SaveData): SaveData => JSON.parse(JSON.stringify(s)) as SaveData;
```

- [ ] **Step 5: Write `src/core/save.ts`**

```ts
import { byId } from '../data/bank';
import { LAST_REVIEW_DAY } from './dates';
import { cloneSave, type Attempt, type Crop, type MockRecord, type SaveData, type Settings } from './state';

export const SAVE_KEY = 'byteHarvest_v1';
export const CORRUPT_KEY = 'byteHarvest_v1_corrupt';

export function defaultSave(): SaveData {
  return {
    v: 1,
    farmer: 'Farmer',
    att: {},
    crops: {},
    harvested: {},
    gold: 0,
    days: {},
    mocks: [],
    hold: true,
    settings: { sound: true, haptics: true, batterySaver: false },
    seenAlmanac: '',
  };
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);
const tagOf = (x: unknown): Attempt['tag'] => (typeof x === 'string' && /^[KCNMT]$/.test(x) ? (x as Attempt['tag']) : null);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function cleanAttempt(x: unknown): Attempt | null {
  if (!isObj(x) || !isDate(x.d) || typeof x.ok !== 'boolean') return null;
  const a: Attempt = {
    d: x.d,
    p: typeof x.p === 'string' ? x.p : '-',
    ok: x.ok,
    c: x.c === 'S' || x.c === 'U' || x.c === 'G' ? x.c : null,
    t: typeof x.t === 'number' && Number.isFinite(x.t) ? x.t : null,
    tag: tagOf(x.tag),
    cue: typeof x.cue === 'string' ? x.cue : '',
    m: x.m === 'review' || x.m === 'mock' || x.m === 'lesson' ? x.m : 'practice',
  };
  if (typeof x.ts === 'number') a.ts = x.ts;
  return a;
}

function cleanCrop(x: unknown): Crop | null {
  if (!isObj(x) || typeof x.id !== 'string' || typeof x.ref !== 'string' || typeof x.topic !== 'string') return null;
  if (x.kind !== 'paper' && x.kind !== 'concept') return null;
  if (!isDate(x.due) || !isDate(x.last) || !isDate(x.plantedOn)) return null;
  const stage = x.stage === 2 || x.stage === 3 ? x.stage : 1;
  return {
    id: x.id, kind: x.kind, ref: x.ref, topic: x.topic, stage,
    due: x.due, last: x.last, plantedOn: x.plantedOn, sbw: x.sbw === true, pest: tagOf(x.pest),
  };
}

function cleanMock(x: unknown): MockRecord | null {
  if (!isObj(x) || !isDate(x.d) || typeof x.name !== 'string') return null;
  if (x.paper !== '2025S' && x.paper !== '2025A' && x.paper !== '2026S') return null;
  if (x.subj !== 'A' && x.subj !== 'B') return null;
  return { d: x.d, name: x.name, paper: x.paper, subj: x.subj, full: x.full === true, score: num(x.score), n: num(x.n), pct: num(x.pct) };
}

/** Accept anything; keep only well-formed parts; fill the rest with defaults. */
export function normalizeSave(raw: unknown): SaveData {
  const s = defaultSave();
  if (!isObj(raw)) return s;
  if (typeof raw.farmer === 'string' && raw.farmer.trim()) s.farmer = raw.farmer.trim().slice(0, 24);
  if (isObj(raw.att)) {
    for (const [id, list] of Object.entries(raw.att)) {
      if (!Array.isArray(list)) continue;
      const clean = list.map(cleanAttempt).filter((a): a is Attempt => a !== null);
      if (clean.length) s.att[id] = clean;
    }
  }
  if (isObj(raw.crops)) {
    for (const [id, c] of Object.entries(raw.crops)) {
      const crop = cleanCrop(c);
      if (crop && crop.id === id) s.crops[id] = crop;
    }
  }
  if (isObj(raw.harvested)) {
    for (const [topic, n] of Object.entries(raw.harvested)) if (num(n) > 0) s.harvested[topic] = Math.floor(num(n));
  }
  s.gold = Math.floor(num(raw.gold));
  if (isObj(raw.days)) {
    for (const [d, log] of Object.entries(raw.days)) {
      if (!isDate(d) || !isObj(log)) continue;
      s.days[d] = {
        answered: num(log.answered), correct: num(log.correct), planted: num(log.planted),
        harvested: num(log.harvested), goldEarned: num(log.goldEarned), focusMin: num(log.focusMin),
      };
    }
  }
  if (Array.isArray(raw.mocks)) s.mocks = raw.mocks.map(cleanMock).filter((m): m is MockRecord => m !== null);
  if (typeof raw.hold === 'boolean') s.hold = raw.hold;
  if (isObj(raw.settings)) {
    const set = raw.settings;
    for (const k of Object.keys(s.settings) as (keyof Settings)[]) {
      const v = set[k];
      if (typeof v === 'boolean') s.settings[k] = v;
    }
  }
  if (isDate(raw.seenAlmanac)) s.seenAlmanac = raw.seenAlmanac;
  return s;
}

export function loadSave(storage: Storage | null): SaveData {
  let raw: string | null = null;
  try {
    raw = storage ? storage.getItem(SAVE_KEY) : null;
  } catch {
    return defaultSave();
  }
  if (!raw) return defaultSave();
  try {
    return normalizeSave(JSON.parse(raw));
  } catch {
    try {
      if (storage && !storage.getItem(CORRUPT_KEY)) storage.setItem(CORRUPT_KEY, raw);
    } catch {
      // Storage is full or blocked; the defaults below still let the game run.
    }
    return defaultSave();
  }
}

export function persistSave(storage: Storage | null, s: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function exportSave(s: SaveData, now: Date): string {
  return JSON.stringify({ app: 'byte-harvest', exportedAt: now.toISOString(), save: s });
}

export type ImportResult =
  | { ok: true; kind: 'game' | 'dojo'; save: SaveData; summary: string }
  | { ok: false; error: string };

export function importBackup(current: SaveData, text: string, today: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (isObj(data) && data.app === 'byte-harvest' && isObj(data.save)) {
    const save = normalizeSave(data.save);
    return { ok: true, kind: 'game', save, summary: `Restored farm: ${plural(Object.keys(save.crops).length, 'crop')}, ${save.gold} gold.` };
  }
  if (isObj(data) && isObj(data.att) && isObj(data.rev)) return importDojo(current, data, today);
  return { ok: false, error: "That file isn't a Byte Harvest or Dojo backup." };
}

const attemptKey = (a: Attempt) => `${a.d}|${a.p}|${a.ok}|${a.c}|${a.t}|${a.m}`;

/** Merge a FE_PastPaper_Dojo backup ({att, rev, mocks, ...}). Idempotent. */
function importDojo(current: SaveData, data: Obj, today: string): ImportResult {
  const save = cloneSave(current);
  let answers = 0;
  let planted = 0;
  let mocks = 0;
  for (const [id, list] of Object.entries(data.att as Obj)) {
    if (!byId[id] || !Array.isArray(list)) continue;
    const seen = new Set((save.att[id] ?? []).map(attemptKey));
    for (const a of list.map(cleanAttempt)) {
      if (!a || seen.has(attemptKey(a))) continue;
      (save.att[id] ??= []).push(a);
      seen.add(attemptKey(a));
      answers += 1;
    }
  }
  for (const [id, r] of Object.entries(data.rev as Obj)) {
    const q = byId[id];
    const cropKey = `paper:${id}`;
    if (!q || !isObj(r) || save.crops[cropKey]) continue;
    const last = isDate(r.last) ? r.last : today;
    let due = isDate(r.due) ? r.due : today;
    if (due > LAST_REVIEW_DAY && today < LAST_REVIEW_DAY) due = LAST_REVIEW_DAY;
    const history = save.att[id] ?? [];
    save.crops[cropKey] = {
      id: cropKey,
      kind: 'paper',
      ref: id,
      topic: q.topic,
      stage: typeof r.clean === 'number' && r.clean >= 1 ? 2 : 1,
      due,
      last,
      plantedOn: last,
      sbw: r.sbw === true,
      pest: history[history.length - 1]?.tag ?? null,
    };
    planted += 1;
  }
  if (Array.isArray(data.mocks)) {
    for (const m of data.mocks.map(cleanMock)) {
      if (!m || save.mocks.some((x) => x.d === m.d && x.name === m.name && x.score === m.score)) continue;
      save.mocks.push(m);
      mocks += 1;
    }
  }
  return {
    ok: true,
    kind: 'dojo',
    save,
    summary: `Dojo import: ${plural(answers, 'answer')}, ${plural(planted, 'crop')} planted, ${plural(mocks, 'mock')}.`,
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd ~/byte-harvest && npx vitest run tests/core/save.test.ts && npm run typecheck`
Expected: `9 passed`, tsc exit 0.

- [ ] **Step 7: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: robust save/load, game backups and idempotent Dojo import

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 5: Crop growth (spaced watering), harvest, gold and pests

**Files:**
- Create: `src/core/economy.ts`, `src/core/srs.ts`, `tests/core/srs.test.ts`

**Interfaces:**
- Consumes: `topicInfo` (Task 2); `capDue` (Task 3); `Crop`, `CropSource`, `SaveData`, `Stage`, `ensureDay` (Task 4); test helpers `makeSave`, `makeCrop`.
- Produces:
  - `economy.ts`: `catchValue(conf: Confidence | null): number` (S 5, U 3, G 1, null 2); `harvestValue(c: Crop): number` (paper 25, +15 if golden; concept 15); `PestInfo {name,label,remedy}`; `PESTS: Record<ErrorTag, PestInfo>`.
  - `srs.ts`: `CropEvent = 'none'|'planted'|'grew'|'ready'|'wilted'|'same-day'`; `AnswerInput {kind, ref, topic, ok, conf, today}`; `AnswerOutcome {event, crop}`; `cropId(kind, ref)`; `isShaky(ok, conf)`; `isThirsty(c, today)`; `applyAnswer(s, a): AnswerOutcome` (mutates `s`); `harvestCrop(s, id, today): {ok, gold}` (mutates `s`); `dueCrops(s, today): Crop[]` (golden first, then oldest due); `readyCrops(s): Crop[]`; `cropsInField(s, field, today): Crop[]` (ready, then golden thirsty, then thirsty, then growing).

- [ ] **Step 1: Write the failing tests**

`tests/core/srs.test.ts`:
```ts
import { catchValue, harvestValue } from '../../src/core/economy';
import { applyAnswer, cropsInField, dueCrops, harvestCrop, readyCrops } from '../../src/core/srs';
import { makeCrop, makeSave } from '../helpers';

const q1 = { kind: 'paper' as const, ref: '2025S_A_Q01', topic: 'Number & logic' };

describe('crop growth (spaced watering)', () => {
  it('plants a seed on a miss, due tomorrow', () => {
    const s = makeSave();
    const r = applyAnswer(s, { ...q1, ok: false, conf: 'U', today: '2026-10-16' });
    expect(r.event).toBe('planted');
    expect(s.crops['paper:2025S_A_Q01']).toMatchObject({ stage: 1, due: '2026-10-17', sbw: false, plantedOn: '2026-10-16' });
  });

  it('makes sure-but-wrong crops golden and plants lucky guesses too', () => {
    const s = makeSave();
    applyAnswer(s, { ...q1, ok: false, conf: 'S', today: '2026-10-16' });
    expect(s.crops['paper:2025S_A_Q01'].sbw).toBe(true);
    const g = applyAnswer(s, { kind: 'paper', ref: '2025S_A_Q02', topic: 'Number & logic', ok: true, conf: 'G', today: '2026-10-16' });
    expect(g.event).toBe('planted');
  });

  it('does nothing for a solid first-time answer', () => {
    const s = makeSave();
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-16' })).toEqual({ event: 'none', crop: null });
    expect(s.crops).toEqual({});
  });

  it('grows only on a later day: +1 day, then +2 days, then ready', () => {
    const s = makeSave();
    applyAnswer(s, { ...q1, ok: false, conf: 'U', today: '2026-10-16' });
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-16' }).event).toBe('same-day');
    const grew = applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-17' });
    expect(grew.event).toBe('grew');
    expect(grew.crop).toMatchObject({ stage: 2, due: '2026-10-19' });
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'U', today: '2026-10-19' }).event).toBe('ready');
    expect(s.crops['paper:2025S_A_Q01'].stage).toBe(3);
  });

  it('wilts one stage on a later miss and keeps the golden mark', () => {
    const s = makeSave({
      crops: { 'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', stage: 2, sbw: true, due: '2026-10-19' }) },
    });
    const r = applyAnswer(s, { ...q1, ok: false, conf: 'U', today: '2026-10-19' });
    expect(r.event).toBe('wilted');
    expect(r.crop).toMatchObject({ stage: 1, due: '2026-10-20', sbw: true });
  });

  it('never schedules past the last review day', () => {
    const s = makeSave({
      crops: { 'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', stage: 1, last: '2026-10-22', due: '2026-10-23' }) },
    });
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-23' }).crop?.due).toBe('2026-10-24');
  });
});

describe('harvest and lists', () => {
  it('harvests only ready crops, paying gold and logging the day', () => {
    const s = makeSave({
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', stage: 3, sbw: true }),
        'paper:2025S_A_Q02': makeCrop({ ref: '2025S_A_Q02', topic: 'Number & logic', stage: 2 }),
      },
    });
    expect(harvestCrop(s, 'paper:2025S_A_Q02', '2026-10-18')).toEqual({ ok: false, gold: 0 });
    expect(harvestCrop(s, 'paper:2025S_A_Q01', '2026-10-18')).toEqual({ ok: true, gold: 40 });
    expect(s.crops['paper:2025S_A_Q01']).toBeUndefined();
    expect(s.harvested['Number & logic']).toBe(1);
    expect(s.gold).toBe(40);
    expect(s.days['2026-10-18']).toMatchObject({ harvested: 1, goldEarned: 40 });
  });

  it('orders thirsty crops golden-first, then by oldest due date', () => {
    const s = makeSave({
      crops: {
        'paper:a': makeCrop({ ref: 'a', topic: 'Network', due: '2026-10-17' }),
        'paper:b': makeCrop({ ref: 'b', topic: 'Network', due: '2026-10-18', sbw: true }),
        'paper:c': makeCrop({ ref: 'c', topic: 'Network', due: '2026-10-20' }),
        'paper:d': makeCrop({ ref: 'd', topic: 'Network', stage: 3 }),
      },
    });
    expect(dueCrops(s, '2026-10-18').map((c) => c.ref)).toEqual(['b', 'a']);
    expect(readyCrops(s).map((c) => c.ref)).toEqual(['d']);
    expect(cropsInField(s, 'tech', '2026-10-18').map((c) => c.ref)).toEqual(['d', 'b', 'a', 'c']);
    expect(cropsInField(s, 'strategy', '2026-10-18')).toEqual([]);
  });

  it('prices catches and harvests', () => {
    expect([catchValue('S'), catchValue('U'), catchValue('G'), catchValue(null)]).toEqual([5, 3, 1, 2]);
    expect(harvestValue(makeCrop({ ref: 'x', topic: 'Network' }))).toBe(25);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/core/srs.test.ts`
Expected: FAIL with `Failed to resolve import "../../src/core/economy"`.

- [ ] **Step 3: Write `src/core/economy.ts`**

```ts
import type { Confidence, ErrorTag } from '../data/types';
import type { Crop } from './state';

/** Gold for a correct past-paper answer. Gold is motivation only; it never buys answers. */
export function catchValue(conf: Confidence | null): number {
  return conf === 'S' ? 5 : conf === 'U' ? 3 : conf === 'G' ? 1 : 2;
}

export function harvestValue(c: Crop): number {
  return c.kind === 'paper' ? 25 + (c.sbw ? 15 : 0) : 15;
}

export interface PestInfo {
  name: string;
  label: string;
  remedy: string;
}

export const PESTS: Record<ErrorTag, PestInfo> = {
  K: { name: 'Blight', label: 'Concept gap', remedy: 'Re-read why + trap, then write the rule in one line.' },
  C: { name: 'Beetle', label: 'Calculation slip', remedy: 'Redo it slowly on paper and check the units.' },
  N: { name: 'Weed', label: 'Notation', remedy: 'Circle the notation first: ←, =, mod, 1-based arrays.' },
  M: { name: 'Mole', label: 'Misread / lost state', remedy: 'Underline what is asked; keep a trace table for loops.' },
  T: { name: 'Frost', label: 'Too slow', remedy: 'Flag and move on after ~2 min (A) or ~6 min (B).' },
};
```

- [ ] **Step 4: Write `src/core/srs.ts`**

```ts
import { topicInfo } from '../data/topics';
import type { Confidence, FieldId } from '../data/types';
import { capDue } from './dates';
import { harvestValue } from './economy';
import { ensureDay, type Crop, type CropSource, type SaveData, type Stage } from './state';

export type CropEvent = 'none' | 'planted' | 'grew' | 'ready' | 'wilted' | 'same-day';

export interface AnswerInput {
  kind: CropSource;
  ref: string;
  topic: string;
  ok: boolean;
  conf: Confidence | null;
  today: string;
}

export interface AnswerOutcome {
  event: CropEvent;
  crop: Crop | null;
}

export const cropId = (kind: CropSource, ref: string) => `${kind}:${ref}`;
export const isShaky = (ok: boolean, conf: Confidence | null) => !ok || conf === 'G';
export const isThirsty = (c: Crop, today: string) => c.stage < 3 && c.due <= today;

/**
 * Misses and lucky guesses plant (or wilt) a crop. A solid answer grows an existing
 * crop only on a later day than its last change: +1 day → stage 2 (+2 days) → ready.
 */
export function applyAnswer(s: SaveData, a: AnswerInput): AnswerOutcome {
  const id = cropId(a.kind, a.ref);
  const crop = s.crops[id];
  if (isShaky(a.ok, a.conf)) {
    const sureWrong = !a.ok && a.conf === 'S';
    if (crop) {
      crop.stage = Math.max(1, crop.stage - 1) as Stage;
      crop.due = capDue(a.today, 1);
      crop.last = a.today;
      crop.sbw = crop.sbw || sureWrong;
      return { event: 'wilted', crop };
    }
    const fresh: Crop = {
      id, kind: a.kind, ref: a.ref, topic: a.topic, stage: 1,
      due: capDue(a.today, 1), last: a.today, plantedOn: a.today, sbw: sureWrong, pest: null,
    };
    s.crops[id] = fresh;
    return { event: 'planted', crop: fresh };
  }
  if (!crop) return { event: 'none', crop: null };
  if (crop.stage === 3) return { event: 'none', crop };
  if (crop.last === a.today) return { event: 'same-day', crop };
  crop.stage = (crop.stage + 1) as Stage;
  crop.last = a.today;
  if (crop.stage === 3) return { event: 'ready', crop };
  crop.due = capDue(a.today, 2);
  return { event: 'grew', crop };
}

export function harvestCrop(s: SaveData, id: string, today: string): { ok: boolean; gold: number } {
  const crop = s.crops[id];
  if (!crop || crop.stage !== 3) return { ok: false, gold: 0 };
  const gold = harvestValue(crop);
  delete s.crops[id];
  s.harvested[crop.topic] = (s.harvested[crop.topic] ?? 0) + 1;
  s.gold += gold;
  const day = ensureDay(s, today);
  day.harvested += 1;
  day.goldEarned += gold;
  return { ok: true, gold };
}

const byPriority = (a: Crop, b: Crop) =>
  Number(b.sbw) - Number(a.sbw) || a.due.localeCompare(b.due) || a.stage - b.stage || a.id.localeCompare(b.id);

export function dueCrops(s: SaveData, today: string): Crop[] {
  return Object.values(s.crops).filter((c) => isThirsty(c, today)).sort(byPriority);
}

export function readyCrops(s: SaveData): Crop[] {
  return Object.values(s.crops).filter((c) => c.stage === 3).sort((a, b) => a.id.localeCompare(b.id));
}

export function cropsInField(s: SaveData, field: FieldId, today: string): Crop[] {
  const rank = (c: Crop) => (c.stage === 3 ? 0 : isThirsty(c, today) ? (c.sbw ? 1 : 2) : 3);
  return Object.values(s.crops)
    .filter((c) => topicInfo(c.topic).field === field)
    .sort((a, b) => rank(a) - rank(b) || a.plantedOn.localeCompare(b.plantedOn) || a.id.localeCompare(b.id));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ~/byte-harvest && npx vitest run tests/core/srs.test.ts && npm run typecheck`
Expected: `9 passed`, tsc exit 0.

- [ ] **Step 6: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: crop growth rules, harvest, gold values and pests

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Recording answers and building practice sets

**Files:**
- Create: `src/core/rng.ts`, `src/core/record.ts`, `src/core/practice.ts`, `tests/core/practice.test.ts`

**Interfaces:**
- Consumes: `BANK`, `byId`, `HOLD_PAPER`, `paperOf`, `subjectOf` (Task 2); `topicInfo` (Task 2); `catchValue` (Task 5); `applyAnswer`, `cropId`, `CropEvent` (Task 5); `ensureDay`, `Attempt`, `AttemptMode`, `Crop`, `SaveData` (Task 4).
- Produces:
  - `rng.ts`: `Rng = () => number`; `mulberry32(seed): Rng`; `shuffle<T>(arr, rng?): T[]` (returns a new array).
  - `record.ts`: `PaperAnswerInput {qid, pick, conf, secs, mode, today, ts}`; `PaperAnswerResult {ok, event, gold, crop}`; `recordPaperAnswer(s, a): PaperAnswerResult` (mutates `s`); `tagMiss(s, qid, tag)`; `setCue(s, qid, cue)`; `lastAttempt(s, qid)`.
  - `practice.ts`: `PracticeOrder = 'smart'|'shuffle'|'paper'`; `PoolFilter {subject: Subject|'*', paper: PaperId|'*', topic: string}` where `topic` is `'*'`, a `FieldId`, or an exact topic name; `mockDone(s, paper, subj)`; `isHeld(s, q)`; `topicMatches(q, topic)`; `buildPool(s, f)`; `tierOf(s, q): 0|1|2|3`; `pickSet(s, f, size, order, rng): string[]`.

- [ ] **Step 1: Write the failing tests**

`tests/core/practice.test.ts`:
```ts
import { buildPool, isHeld, pickSet, tierOf, topicMatches } from '../../src/core/practice';
import { recordPaperAnswer, setCue, tagMiss } from '../../src/core/record';
import { mulberry32, shuffle } from '../../src/core/rng';
import { byId } from '../../src/data/bank';
import { makeSave } from '../helpers';

describe('recording past-paper answers', () => {
  it('stores the attempt, pays gold and logs the day for a correct answer', () => {
    const s = makeSave();
    const r = recordPaperAnswer(s, { qid: '2025S_A_Q01', pick: 'a', conf: 'S', secs: 40, mode: 'practice', today: '2026-10-16', ts: 1 });
    expect(r).toMatchObject({ ok: true, event: 'none', gold: 5 });
    expect(s.att['2025S_A_Q01'][0]).toMatchObject({ d: '2026-10-16', p: 'a', ok: true, c: 'S', t: 40, m: 'practice', ts: 1 });
    expect(s.days['2026-10-16']).toMatchObject({ answered: 1, correct: 1, goldEarned: 5 });
  });

  it('plants a crop on a miss and records the pest and a cue', () => {
    const s = makeSave();
    const r = recordPaperAnswer(s, { qid: '2025S_A_Q01', pick: 'c', conf: 'S', secs: 80, mode: 'practice', today: '2026-10-16', ts: 2 });
    expect(r).toMatchObject({ ok: false, event: 'planted', gold: 0 });
    tagMiss(s, '2025S_A_Q01', 'K');
    setCue(s, '2025S_A_Q01', '  AND with 1s keeps bits ');
    expect(s.att['2025S_A_Q01'][0]).toMatchObject({ tag: 'K', cue: 'AND with 1s keeps bits' });
    expect(s.crops['paper:2025S_A_Q01'].pest).toBe('K');
    expect(s.days['2026-10-16'].planted).toBe(1);
  });
});

describe('practice pools', () => {
  it('holds back 2026S until its full mock is recorded, per subject', () => {
    const s = makeSave();
    expect(isHeld(s, byId['2026S_A_Q01'])).toBe(true);
    expect(buildPool(s, { subject: '*', paper: '*', topic: '*' })).toHaveLength(160);
    s.mocks.push({ d: '2026-10-17', name: '2026S Subject A', paper: '2026S', subj: 'A', full: true, score: 40, n: 60, pct: 67 });
    expect(isHeld(s, byId['2026S_A_Q01'])).toBe(false);
    expect(isHeld(s, byId['2026S_B_Q01'])).toBe(true);
    s.hold = false;
    expect(buildPool(s, { subject: '*', paper: '*', topic: '*' })).toHaveLength(240);
  });

  it('filters by field id or by exact topic', () => {
    expect(topicMatches(byId['2025S_A_Q03'], 'strategy')).toBe(true);
    expect(topicMatches(byId['2025S_A_Q03'], 'System strategy')).toBe(true);
    expect(topicMatches(byId['2025S_A_Q03'], 'tech')).toBe(false);
    const sec = buildPool(makeSave(), { subject: 'B', paper: '*', topic: 'security' });
    expect(sec.length).toBeGreaterThan(0);
    expect(sec.every((q) => q.topic === 'Security' && q.id.includes('_B_'))).toBe(true);
  });

  it('smart order puts sure-but-wrong first, then misses, then unseen, then solid', () => {
    const s = makeSave();
    s.att['2025S_A_Q05'] = [{ d: '2026-10-15', p: 'd', ok: true, c: 'S', t: 10, tag: null, cue: '', m: 'practice' }];
    s.att['2025S_A_Q04'] = [{ d: '2026-10-15', p: 'a', ok: false, c: 'U', t: 10, tag: null, cue: '', m: 'practice' }];
    s.att['2025S_A_Q03'] = [{ d: '2026-10-15', p: 'a', ok: false, c: 'S', t: 10, tag: null, cue: '', m: 'practice' }];
    const ids = pickSet(s, { subject: 'A', paper: '2025S', topic: '*' }, 60, 'smart', mulberry32(1));
    expect(ids[0]).toBe('2025S_A_Q03');
    expect(ids[1]).toBe('2025S_A_Q04');
    expect(ids[ids.length - 1]).toBe('2025S_A_Q05');
    expect(tierOf(s, byId['2025S_A_Q60'])).toBe(2);
  });

  it('paper order follows question numbers and respects the set size', () => {
    expect(pickSet(makeSave(), { subject: 'A', paper: '2025S', topic: '*' }, 3, 'paper', mulberry32(1))).toEqual([
      '2025S_A_Q01',
      '2025S_A_Q02',
      '2025S_A_Q03',
    ]);
  });

  it('shuffles deterministically with a seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(42))).toEqual(shuffle([1, 2, 3, 4, 5], mulberry32(42)));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/core/practice.test.ts`
Expected: FAIL with `Failed to resolve import "../../src/core/practice"`.

- [ ] **Step 3: Write `src/core/rng.ts`**

```ts
export type Rng = () => number;

/** Small seeded PRNG so tests (and future fresh-variant generators) are reproducible. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Step 4: Write `src/core/record.ts`**

```ts
import { byId } from '../data/bank';
import type { Confidence, ErrorTag } from '../data/types';
import { catchValue } from './economy';
import { applyAnswer, cropId, type CropEvent } from './srs';
import { ensureDay, type Attempt, type AttemptMode, type Crop, type SaveData } from './state';

export interface PaperAnswerInput {
  qid: string;
  pick: string;
  conf: Confidence | null;
  secs: number | null;
  mode: AttemptMode;
  today: string;
  ts: number;
}

export interface PaperAnswerResult {
  ok: boolean;
  event: CropEvent;
  gold: number;
  crop: Crop | null;
}

export const lastAttempt = (s: SaveData, qid: string): Attempt | undefined => {
  const list = s.att[qid];
  return list ? list[list.length - 1] : undefined;
};

export function recordPaperAnswer(s: SaveData, a: PaperAnswerInput): PaperAnswerResult {
  const q = byId[a.qid];
  if (!q) throw new Error(`Unknown question ${a.qid}`);
  const ok = a.pick === q.key;
  (s.att[a.qid] ??= []).push({ d: a.today, p: a.pick, ok, c: a.conf, t: a.secs, tag: null, cue: '', m: a.mode, ts: a.ts });
  const { event, crop } = applyAnswer(s, { kind: 'paper', ref: a.qid, topic: q.topic, ok, conf: a.conf, today: a.today });
  const gold = ok ? catchValue(a.conf) : 0;
  s.gold += gold;
  const day = ensureDay(s, a.today);
  day.answered += 1;
  if (ok) day.correct += 1;
  if (event === 'planted') day.planted += 1;
  day.goldEarned += gold;
  return { ok, event, gold, crop: crop ? { ...crop } : null };
}

export function tagMiss(s: SaveData, qid: string, tag: ErrorTag): void {
  const a = lastAttempt(s, qid);
  if (a && !a.ok) a.tag = tag;
  const crop = s.crops[cropId('paper', qid)];
  if (crop) crop.pest = tag;
}

export function setCue(s: SaveData, qid: string, cue: string): void {
  const a = lastAttempt(s, qid);
  if (a) a.cue = cue.trim().slice(0, 200);
}
```

- [ ] **Step 5: Write `src/core/practice.ts`**

```ts
import { BANK, HOLD_PAPER, paperOf, subjectOf } from '../data/bank';
import { topicInfo } from '../data/topics';
import type { BankQuestion, FieldId, PaperId, Subject } from '../data/types';
import { shuffle, type Rng } from './rng';
import type { SaveData } from './state';

export type PracticeOrder = 'smart' | 'shuffle' | 'paper';

/** topic: '*' (all), a FieldId ('strategy', 'tech', 'security', 'devdb', 'code') or an exact bank topic. */
export interface PoolFilter {
  subject: Subject | '*';
  paper: PaperId | '*';
  topic: string;
}

const FIELD_IDS: readonly string[] = ['strategy', 'tech', 'security', 'devdb', 'code'] satisfies FieldId[];

export const mockDone = (s: SaveData, paper: PaperId, subj: Subject) =>
  s.mocks.some((m) => m.paper === paper && m.subj === subj && m.full);

export const isHeld = (s: SaveData, q: BankQuestion) =>
  s.hold && paperOf(q.id) === HOLD_PAPER && !mockDone(s, HOLD_PAPER, subjectOf(q.id));

export function topicMatches(q: BankQuestion, topic: string): boolean {
  if (topic === '*') return true;
  if (FIELD_IDS.includes(topic)) return topicInfo(q.topic).field === topic;
  return q.topic === topic;
}

export function buildPool(s: SaveData, f: PoolFilter): BankQuestion[] {
  return BANK.filter(
    (q) =>
      (f.subject === '*' || subjectOf(q.id) === f.subject) &&
      (f.paper === '*' || paperOf(q.id) === f.paper) &&
      topicMatches(q, f.topic) &&
      !isHeld(s, q),
  );
}

/** 0 sure-but-wrong last time · 1 missed or guessed · 2 unseen · 3 answered solidly. */
export function tierOf(s: SaveData, q: BankQuestion): 0 | 1 | 2 | 3 {
  const list = s.att[q.id];
  const last = list?.[list.length - 1];
  if (!last) return 2;
  if (!last.ok && last.c === 'S') return 0;
  if (!last.ok || last.c === 'G') return 1;
  return 3;
}

export function pickSet(s: SaveData, f: PoolFilter, size: number, order: PracticeOrder, rng: Rng): string[] {
  let pool = buildPool(s, f);
  if (order === 'paper') pool = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  else if (order === 'shuffle') pool = shuffle(pool, rng);
  else pool = shuffle(pool, rng).sort((a, b) => tierOf(s, a) - tierOf(s, b));
  return pool.slice(0, size).map((q) => q.id);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd ~/byte-harvest && npx vitest run tests/core/practice.test.ts && npm run typecheck`
Expected: `7 passed`, tsc exit 0.

- [ ] **Step 7: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: record answers into crops/gold and build practice sets with the 2026S hold

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Diary report and the focus-stamina timer

**Files:**
- Create: `src/core/report.ts`, `src/core/stamina.ts`, `tests/core/report.test.ts`, `tests/core/stamina.test.ts`

**Interfaces:**
- Consumes: `byId`, `sourceLabel`, `subjectOf` (Task 2); `daysToExam`, `fmtClock` (Task 3); `dueCrops` (Task 5); `Attempt`, `SaveData` (Task 4); `recordPaperAnswer`, `tagMiss` (Task 6, tests only).
- Produces:
  - `report.ts`: `Row = Attempt & {id}`; `Mastery = 'new'|'red'|'yel'|'grn'`; `allAttempts(s): Row[]`; `masteryOf(right, n): Mastery` (n < 3 new; < 50 % red; < 80 % yellow; else green); `topicMastery(s, topic): {right, n, status}`; `weakTopics(s): string[]`; `diaryReport(s, today): string` (8 lines, reviewer-chat format).
  - `stamina.ts`: `FOCUS_BLOCK_MS` (25 min), `REST_MS` (3 min), `IDLE_CUTOFF_MS` (3 min); `StaminaState {day, sinceBreakMs, focusMsToday, lastTick, lastActivity}`; `newStamina(day, nowMs, focusMsToday?)`; `markActivity(st, nowMs)`; `tick(st, nowMs, day)`; `staminaPct(st)`; `needsRest(st)`; `rested(st)`.

- [ ] **Step 1: Write the failing tests**

`tests/core/report.test.ts`:
```ts
import { recordPaperAnswer, tagMiss } from '../../src/core/record';
import { diaryReport, masteryOf, topicMastery, weakTopics } from '../../src/core/report';
import type { SaveData } from '../../src/core/state';
import type { Confidence } from '../../src/data/types';
import { makeSave } from '../helpers';

const T = '2026-10-16';
const answer = (s: SaveData, qid: string, pick: string, conf: Confidence, ts: number) =>
  recordPaperAnswer(s, { qid, pick, conf, secs: 65, mode: 'practice', today: T, ts });

describe('diary report', () => {
  it('summarises the day in the reviewer-chat format', () => {
    const s = makeSave();
    answer(s, '2025S_A_Q01', 'c', 'S', 1); // sure but wrong (key a)
    tagMiss(s, '2025S_A_Q01', 'K');
    answer(s, '2025S_A_Q02', 'a', 'G', 2); // lucky guess (key a)
    answer(s, '2025S_B_Q02', 'a', 'U', 3); // miss (key d)
    answer(s, '2025S_A_Q03', 'b', 'S', 4); // correct (key b)
    const lines = diaryReport(s, T).split('\n');
    expect(lines[0]).toBe('Byte Harvest diary · 2026-10-16 · D-9');
    expect(lines[1]).toBe('Today: 2/4 (A 2/3, B 0/1) · first half 50% · second half 50%');
    expect(lines[2]).toBe('Sure but wrong: (2025S, FE, Subject-A, Q1) Number & logic/bit masking picked c key a sure 1:05 [K]');
    expect(lines[3]).toContain('(2025S, FE, Subject-B, Q2)');
    expect(lines[4]).toBe('Lucky guesses: (2025S, FE, Subject-A, Q2)');
    expect(lines[6]).toBe('Farm: 3 crops (0 thirsty, 0 ready) · harvested today 0 · gold 6 · focus 0 min');
    expect(lines[7]).toBe('Mocks: none');
  });
});

describe('mastery', () => {
  it('uses the Dojo thresholds', () => {
    expect([masteryOf(1, 2), masteryOf(1, 3), masteryOf(2, 3), masteryOf(4, 5)]).toEqual(['new', 'red', 'yel', 'grn']);
  });

  it('computes topic mastery and weak topics', () => {
    const s = makeSave();
    answer(s, '2025S_A_Q01', 'c', 'U', 1);
    answer(s, '2025S_A_Q02', 'b', 'U', 2);
    expect(topicMastery(s, 'Number & logic')).toEqual({ right: 0, n: 2, status: 'new' });
    expect(weakTopics(s)).toEqual(['A · Number & logic 0/2']);
  });
});
```

`tests/core/stamina.test.ts`:
```ts
import { markActivity, needsRest, newStamina, rested, staminaPct, tick } from '../../src/core/stamina';

const MIN = 60_000;

describe('focus stamina', () => {
  it('drains while you are active and refills after a rest', () => {
    let st = newStamina('2026-10-16', 0);
    for (let t = MIN; t <= 25 * MIN; t += MIN) {
      st = markActivity(st, t - 1000);
      st = tick(st, t, '2026-10-16');
    }
    expect(needsRest(st)).toBe(true);
    expect(staminaPct(st)).toBe(0);
    expect(Math.round(st.focusMsToday / MIN)).toBe(25);
    st = rested(st);
    expect(staminaPct(st)).toBe(100);
  });

  it('does not drain while you are idle', () => {
    let st = newStamina('2026-10-16', 0);
    st = tick(st, MIN, '2026-10-16');
    st = tick(st, 2 * MIN, '2026-10-16');
    st = tick(st, 2.5 * MIN, '2026-10-16');
    st = tick(st, 4 * MIN, '2026-10-16'); // 4 min since the last activity → idle
    expect(st.sinceBreakMs).toBe(2.5 * MIN);
  });

  it('counts a long absence as a rest and resets focus on a new day', () => {
    let st = newStamina('2026-10-16', 0, 30 * MIN);
    st = tick(st, MIN, '2026-10-16');
    expect(st.sinceBreakMs).toBe(MIN);
    st = tick(st, 11 * MIN, '2026-10-17');
    expect(st.sinceBreakMs).toBe(0);
    expect(st.focusMsToday).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/core/report.test.ts tests/core/stamina.test.ts`
Expected: FAIL with `Failed to resolve import "../../src/core/report"` (and `.../stamina`).

- [ ] **Step 3: Write `src/core/report.ts`**

```ts
import { byId, sourceLabel, subjectOf } from '../data/bank';
import { daysToExam, fmtClock } from './dates';
import { dueCrops } from './srs';
import type { Attempt, SaveData } from './state';

export type Row = Attempt & { id: string };
export type Mastery = 'new' | 'red' | 'yel' | 'grn';

const CONF_WORD = { S: 'sure', U: 'unsure', G: 'guess' } as const;

export function allAttempts(s: SaveData): Row[] {
  return Object.entries(s.att).flatMap(([id, list]) => (byId[id] ? list.map((a) => ({ ...a, id })) : []));
}

const rightOf = (rows: Row[]) => rows.filter((r) => r.ok).length;
const frac = (rows: Row[]) => (rows.length ? `${rightOf(rows)}/${rows.length}` : '–');
const pct = (rows: Row[]) => (rows.length ? `${Math.round((100 * rightOf(rows)) / rows.length)}%` : '–');

export function masteryOf(right: number, n: number): Mastery {
  if (n < 3) return 'new';
  const p = right / n;
  return p < 0.5 ? 'red' : p < 0.8 ? 'yel' : 'grn';
}

export function topicMastery(s: SaveData, topic: string): { right: number; n: number; status: Mastery } {
  const rows = allAttempts(s).filter((r) => byId[r.id].topic === topic);
  const right = rightOf(rows);
  return { right, n: rows.length, status: masteryOf(right, rows.length) };
}

export function weakTopics(s: SaveData): string[] {
  const tally = new Map<string, [number, number]>();
  for (const r of allAttempts(s)) {
    const key = `${subjectOf(r.id)} · ${byId[r.id].topic}`;
    const v = tally.get(key) ?? [0, 0];
    v[1] += 1;
    if (r.ok) v[0] += 1;
    tally.set(key, v);
  }
  return [...tally.entries()]
    .filter(([, [a, n]]) => n >= 2 && a / n < 0.6)
    .sort((x, y) => x[1][0] / x[1][1] - y[1][0] / y[1][1])
    .slice(0, 6)
    .map(([k, [a, n]]) => `${k} ${a}/${n}`);
}

function line(r: Row): string {
  const q = byId[r.id];
  return (
    `${sourceLabel(r.id)} ${q.topic}/${q.sub} picked ${r.p} key ${q.key}` +
    `${r.c ? ` ${CONF_WORD[r.c]}` : ''}${r.t ? ` ${fmtClock(r.t)}` : ''}${r.tag ? ` [${r.tag}]` : ''}${r.cue ? ` cue: ${r.cue}` : ''}`
  );
}

/** Same shape as the Dojo report, so the reviewer-chat workflow keeps working. */
export function diaryReport(s: SaveData, today: string): string {
  const td = allAttempts(s)
    .filter((r) => r.d === today)
    .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  const half = Math.ceil(td.length / 2);
  const miss = td.filter((r) => !r.ok);
  const crops = Object.values(s.crops);
  const day = s.days[today];
  return [
    `Byte Harvest diary · ${today} · D-${daysToExam(today)}`,
    `Today: ${frac(td)} (A ${frac(td.filter((r) => subjectOf(r.id) === 'A'))}, B ${frac(td.filter((r) => subjectOf(r.id) === 'B'))}) · first half ${pct(td.slice(0, half))} · second half ${pct(td.slice(half))}`,
    `Sure but wrong: ${miss.filter((r) => r.c === 'S').map(line).join('; ') || 'none'}`,
    `Other misses: ${miss.filter((r) => r.c !== 'S').map(line).join('; ') || 'none'}`,
    `Lucky guesses: ${td.filter((r) => r.ok && r.c === 'G').map((r) => sourceLabel(r.id)).join(', ') || 'none'}`,
    `Weak topics (all time): ${weakTopics(s).join(', ') || 'none yet'}`,
    `Farm: ${crops.length} crops (${dueCrops(s, today).length} thirsty, ${crops.filter((c) => c.stage === 3).length} ready) · harvested today ${day?.harvested ?? 0} · gold ${s.gold} · focus ${day?.focusMin ?? 0} min`,
    `Mocks: ${s.mocks.map((m) => `${m.name} ${m.pct}%`).join(', ') || 'none'}`,
  ].join('\n');
}
```

- [ ] **Step 4: Write `src/core/stamina.ts`**

```ts
export const FOCUS_BLOCK_MS = 25 * 60_000;
export const REST_MS = 3 * 60_000;
export const IDLE_CUTOFF_MS = 3 * 60_000;

export interface StaminaState {
  day: string;
  sinceBreakMs: number;
  focusMsToday: number;
  lastTick: number;
  lastActivity: number;
}

export function newStamina(day: string, nowMs: number, focusMsToday = 0): StaminaState {
  return { day, sinceBreakMs: 0, focusMsToday, lastTick: nowMs, lastActivity: nowMs };
}

export const markActivity = (st: StaminaState, nowMs: number): StaminaState => ({ ...st, lastActivity: nowMs });

/** Time only counts while you were active recently; a gap ≥ REST_MS counts as a break. */
export function tick(st: StaminaState, nowMs: number, day: string): StaminaState {
  const dt = Math.max(0, nowMs - st.lastTick);
  let { sinceBreakMs, focusMsToday } = st;
  if (day !== st.day) focusMsToday = 0;
  if (dt >= REST_MS) sinceBreakMs = 0;
  else if (nowMs - st.lastActivity <= IDLE_CUTOFF_MS) {
    sinceBreakMs += dt;
    focusMsToday += dt;
  }
  return { ...st, day, sinceBreakMs, focusMsToday, lastTick: nowMs };
}

export const staminaPct = (st: StaminaState) => Math.max(0, 100 - (100 * st.sinceBreakMs) / FOCUS_BLOCK_MS);
export const needsRest = (st: StaminaState) => st.sinceBreakMs >= FOCUS_BLOCK_MS;
export const rested = (st: StaminaState): StaminaState => ({ ...st, sinceBreakMs: 0 });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ~/byte-harvest && npx vitest run tests/core && npm run typecheck`
Expected: all `tests/core` files pass (`dates` 5, `save` 9, `srs` 9, `practice` 7, `report` 3, `stamina` 3); tsc exit 0.

- [ ] **Step 6: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: reviewer-chat diary report and 25-minute focus stamina

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: App shell: store, design system, panels, sounds

**Files:**
- Create: `src/app/store.ts`, `src/app/panel-types.ts`, `src/app/panels.tsx`, `src/app/feedback.ts`, `src/ui/icons.tsx`, `src/ui/kit.tsx`, `src/styles/base.css`, `tests/app/store.test.ts`, `tests/ui/kit.test.tsx`
- Modify: `src/app/App.tsx` (full rewrite), `src/main.tsx` (add font), `tests/smoke.test.tsx` (full rewrite)

**Interfaces:**
- Consumes: `localDate` (Task 3); `loadSave`, `persistSave`, `defaultSave`, `SAVE_KEY` (Task 4); `cloneSave`, `SaveData`, `AttemptMode` (Task 4); `FieldId`, `Subject` (Task 2).
- Produces:
  - `store.ts`: signals `save`, `now` (epoch ms), `today` (computed `YYYY-MM-DD`), `panel` (`PanelState | null`), `toast`, `saveFailed`; functions `update<T>(fn: (draft: SaveData) => T): T`, `flush()`, `replaceSave(next)`, `openPanel(p)`, `closePanel()`, `showToast(text)`, `startClock(): () => void`.
  - `panel-types.ts`: `PanelState = {kind:'almanac'} | {kind:'session', ids, mode, title} | {kind:'field', field} | {kind:'practice', subject, area?} | {kind:'house'}`.
  - `panels.tsx`: `PanelHost({panel})`, with one `switch (p.kind)` that later tasks extend with `case` lines.
  - `feedback.ts`: `sfx(kind: 'tap'|'right'|'wrong'|'harvest'|'plant')`, `buzz(ms?)`.
  - `icons.tsx`: `CloseIcon`, `DropIcon`, `CoinIcon`, `LeafIcon`.
  - `kit.tsx`: `Button({children,onClick,disabled,variant,small,block,label,extra})`, `Panel({title,onClose,children,art?})` (role=dialog, aria-label=title, Close button, Escape key), `Chip({tone,children})`, `Bar({pct,color,label})`, `ToastHost()`.
  - CSS classes in `base.css`: `.app`, `.stage`, `.scene-wrap`, `.panel-layer`, `.panel`, `.panel-head`, `.panel-body`, `.btn` (+ `.gold .blue .danger .ghost .small .block`), `.card`, `.row`, `.muted`, `.chip` (+ tones), `.bar`, `.toast`, `.icon-btn`, `.save-warn`, `.center`, `.field-row`.

- [ ] **Step 1: Write the failing tests**

`tests/app/store.test.ts`:
```ts
import { closePanel, flush, now, openPanel, panel, save, showToast, toast, today, update } from '../../src/app/store';
import { SAVE_KEY, defaultSave } from '../../src/core/save';

beforeEach(() => {
  localStorage.clear();
  save.value = defaultSave();
  panel.value = null;
});

describe('store', () => {
  it('applies updates to a copy and persists on flush', () => {
    const before = save.value;
    const result = update((s) => {
      s.gold = 42;
      return 'done';
    });
    expect(result).toBe('done');
    expect(save.value.gold).toBe(42);
    expect(before.gold).toBe(0);
    flush();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).gold).toBe(42);
  });

  it('follows the clock across local midnight', () => {
    now.value = new Date(2026, 9, 16, 23, 59).getTime();
    expect(today.value).toBe('2026-10-16');
    now.value = new Date(2026, 9, 17, 0, 1).getTime();
    expect(today.value).toBe('2026-10-17');
  });

  it('opens and closes one panel at a time', () => {
    openPanel({ kind: 'house' });
    expect(panel.value).toEqual({ kind: 'house' });
    openPanel({ kind: 'almanac' });
    expect(panel.value).toEqual({ kind: 'almanac' });
    closePanel();
    expect(panel.value).toBeNull();
  });

  it('shows a toast that clears itself', () => {
    vi.useFakeTimers();
    showToast('Shipped!');
    expect(toast.value?.text).toBe('Shipped!');
    vi.advanceTimersByTime(3000);
    expect(toast.value).toBeNull();
    vi.useRealTimers();
  });
});
```

`tests/ui/kit.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { showToast } from '../../src/app/store';
import { Button, Panel, ToastHost } from '../../src/ui/kit';

describe('UI kit', () => {
  it('Panel shows a title and closes with the button and with Escape', () => {
    const onClose = vi.fn();
    render(
      <Panel title="Pond" onClose={onClose}>
        <p>Body</p>
      </Panel>,
    );
    expect(screen.getByRole('dialog', { name: 'Pond' })).toHaveTextContent('Body');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Button forwards clicks and can be disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Cast</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Cast
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Cast' })).toBeDisabled();
  });

  it('ToastHost shows the current toast', () => {
    showToast('Harvested! +25g');
    render(<ToastHost />);
    expect(screen.getByRole('status')).toHaveTextContent('Harvested! +25g');
  });
});
```

Replace `tests/smoke.test.tsx` entirely:
```tsx
import { render } from '@testing-library/preact';
import { App } from '../src/app/App';

describe('app shell', () => {
  it('renders the farm stage', () => {
    const { container } = render(<App />);
    expect(container.querySelector('main.stage')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/app tests/ui tests/smoke.test.tsx`
Expected: FAIL with `Failed to resolve import "../../src/app/store"` and `.../ui/kit`. The smoke test fails because `main.stage` does not exist yet.

- [ ] **Step 3: Write `src/app/panel-types.ts` and `src/app/store.ts`**

`src/app/panel-types.ts`:
```ts
import type { AttemptMode } from '../core/state';
import type { FieldId, Subject } from '../data/types';

export type PanelState =
  | { kind: 'almanac' }
  | { kind: 'session'; ids: string[]; mode: AttemptMode; title: string }
  | { kind: 'field'; field: FieldId }
  | { kind: 'practice'; subject: Subject; area?: string }
  | { kind: 'house' };
```

`src/app/store.ts`:
```ts
import { computed, signal } from '@preact/signals';
import { localDate } from '../core/dates';
import { loadSave, persistSave } from '../core/save';
import { cloneSave, type SaveData } from '../core/state';
import type { PanelState } from './panel-types';

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const storage = getStorage();

export const save = signal<SaveData>(loadSave(storage));
export const now = signal<number>(Date.now());
export const today = computed(() => localDate(new Date(now.value)));
export const panel = signal<PanelState | null>(null);
export const toast = signal<{ id: number; text: string } | null>(null);
export const saveFailed = signal(false);

let pending: ReturnType<typeof setTimeout> | null = null;

/** Apply a change to a copy of the save, publish it, and persist shortly after. */
export function update<T>(fn: (draft: SaveData) => T): T {
  const draft = cloneSave(save.value);
  const result = fn(draft);
  save.value = draft;
  if (pending) clearTimeout(pending);
  pending = setTimeout(flush, 250);
  return result;
}

export function flush(): void {
  if (pending) clearTimeout(pending);
  pending = null;
  saveFailed.value = !persistSave(storage, save.value);
}

export function replaceSave(next: SaveData): void {
  save.value = next;
  flush();
}

export function openPanel(p: PanelState): void {
  panel.value = p;
}

export function closePanel(): void {
  panel.value = null;
}

let toastSeq = 0;
export function showToast(text: string): void {
  const id = ++toastSeq;
  toast.value = { id, text };
  setTimeout(() => {
    if (toast.value?.id === id) toast.value = null;
  }, 2600);
}

/** Keep `now` fresh so the day rolls over at midnight without a reload; save when hidden. */
export function startClock(): () => void {
  const tickNow = () => {
    now.value = Date.now();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') tickNow();
    else flush();
  };
  const timer = setInterval(tickNow, 30_000);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flush);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', flush);
  };
}
```

- [ ] **Step 4: Write `src/app/feedback.ts`**

```ts
import { save } from './store';

type Sfx = 'tap' | 'right' | 'wrong' | 'harvest' | 'plant';
type AudioCtor = new () => AudioContext;

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

// [frequency Hz, start s, duration s, waveform]
const NOTES: Record<Sfx, [number, number, number, OscillatorType][]> = {
  tap: [[660, 0, 0.05, 'triangle']],
  right: [[660, 0, 0.09, 'triangle'], [880, 0.08, 0.14, 'triangle']],
  wrong: [[220, 0, 0.16, 'sine'], [180, 0.1, 0.18, 'sine']],
  harvest: [[523, 0, 0.08, 'triangle'], [659, 0.07, 0.08, 'triangle'], [784, 0.14, 0.16, 'triangle']],
  plant: [[392, 0, 0.08, 'sine'], [523, 0.06, 0.1, 'sine']],
};

/** Tiny synthesized blips: no audio files to download. */
export function sfx(kind: Sfx): void {
  if (!save.value.settings.sound) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();
  for (const [freq, start, dur, type] of NOTES[kind]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t0 = ac.currentTime + start;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

export function buzz(ms = 12): void {
  if (!save.value.settings.haptics) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
}
```

- [ ] **Step 5: Write `src/ui/icons.tsx` and `src/ui/kit.tsx`**

`src/ui/icons.tsx`:
```tsx
export const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
  </svg>
);

export const DropIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5C9 7 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 2.5z" fill="#4fb3f0" />
    <ellipse cx="9.5" cy="14" rx="1.6" ry="2.6" fill="#fff" opacity=".7" />
  </svg>
);

export const CoinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#f4b63d" stroke="#c88a17" stroke-width="2" />
    <path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4" stroke="#8a5c08" stroke-width="1.8" fill="none" stroke-linecap="round" />
  </svg>
);

export const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z" fill="#6cc04a" />
    <path d="M5 19L15 9" stroke="#3f8a2c" stroke-width="1.8" stroke-linecap="round" />
  </svg>
);
```

`src/ui/kit.tsx`:
```tsx
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { toast } from '../app/store';
import { CloseIcon } from './icons';

type Variant = 'primary' | 'gold' | 'blue' | 'danger' | 'ghost';

interface ButtonProps {
  children?: ComponentChildren;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  small?: boolean;
  block?: boolean;
  label?: string;
  extra?: string;
}

export function Button({ children, onClick, disabled, variant = 'primary', small, block, label, extra }: ButtonProps) {
  const cls = ['btn', variant === 'primary' ? '' : variant, small ? 'small' : '', block ? 'block' : '', extra ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" class={cls} onClick={onClick} disabled={disabled} aria-label={label}>
      {children}
    </button>
  );
}

interface PanelProps {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  art?: ComponentChildren;
}

export function Panel({ title, onClose, children, art }: PanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <section class="panel" role="dialog" aria-label={title}>
      <header class="panel-head">
        {art && (
          <span class="panel-art" aria-hidden="true">
            {art}
          </span>
        )}
        <h2>{title}</h2>
        <button type="button" class="icon-btn" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </header>
      <div class="panel-body">{children}</div>
    </section>
  );
}

export function Chip({ tone, children }: { tone?: 'red' | 'yel' | 'grn' | 'gold' | 'blue'; children: ComponentChildren }) {
  return <span class={`chip${tone ? ` ${tone}` : ''}`}>{children}</span>;
}

export function Bar({ pct, color, label }: { pct: number; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div class="bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function ToastHost() {
  const t = toast.value;
  return t ? (
    <div class="toast" role="status" key={t.id}>
      {t.text}
    </div>
  ) : null;
}
```

- [ ] **Step 6: Write `src/styles/base.css`**

```css
:root {
  --cream: #fdf8ec;
  --paper: #fffdf8;
  --ink: #2b2620;
  --mute: #776f62;
  --line: #ece2cf;
  --green: #3a9a5b;
  --green-d: #2a7444;
  --gold: #f4b63d;
  --gold-d: #c88a17;
  --red: #e2583f;
  --red-d: #b63e2a;
  --blue: #3d9be9;
  --blue-d: #2a77bd;
  --grass: #86c45e;
  --radius: 18px;
  --shadow: 0 8px 24px rgba(58, 40, 12, 0.14);
  --font: 'Nunito Variable', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --hud-h: 56px;
}

* { box-sizing: border-box; }
html, body, #app { height: 100%; margin: 0; }
body {
  background: var(--grass);
  color: var(--ink);
  font: 16px/1.45 var(--font);
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
button, input, select, textarea { font: inherit; color: inherit; }
button { touch-action: manipulation; }
img { max-width: 100%; }

.app { position: fixed; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr); overflow: hidden; }
.stage { position: relative; overflow: hidden; min-width: 0; }
/* The HUD (Task 11) occupies the top var(--hud-h); the farm fills the rest. */
.scene-wrap { position: absolute; left: 0; right: 0; bottom: 0; top: calc(var(--hud-h) + var(--safe-top)); }
@media (min-width: 900px) {
  .app.has-panel { grid-template-columns: minmax(0, 1fr) min(880px, 62vw); }
}

/* Buttons: chunky "3D" game buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 10px 18px; border: 0; border-radius: 14px;
  background: var(--green); color: #fff; font-weight: 800; letter-spacing: 0.01em; cursor: pointer;
  box-shadow: 0 4px 0 var(--green-d); transition: transform 0.06s ease, box-shadow 0.06s ease, filter 0.15s;
}
.btn:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--green-d); }
.btn:disabled { filter: grayscale(0.6) opacity(0.55); cursor: default; }
.btn.gold { background: var(--gold); color: #3b2a05; box-shadow: 0 4px 0 var(--gold-d); }
.btn.blue { background: var(--blue); box-shadow: 0 4px 0 var(--blue-d); }
.btn.danger { background: var(--red); box-shadow: 0 4px 0 var(--red-d); }
.btn.ghost { background: var(--paper); color: var(--ink); border: 2px solid var(--line); box-shadow: 0 4px 0 var(--line); }
.btn.small { min-height: 44px; padding: 6px 12px; font-size: 14px; border-radius: 12px; }
.btn.block { width: 100%; }

/* Panels: full screen on phones, right column on PC */
.panel-layer { position: fixed; inset: 0; z-index: 30; display: flex; background: rgba(28, 34, 20, 0.28); }
.panel { display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--cream); animation: panel-in 0.18s ease-out; }
@media (min-width: 900px) {
  .panel-layer { position: relative; inset: auto; z-index: 1; background: none; }
  .panel { border-left: 3px solid var(--line); box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08); }
}
.panel-head {
  display: flex; align-items: center; gap: 10px;
  padding: calc(10px + var(--safe-top)) 14px 10px; background: var(--paper); border-bottom: 2px solid var(--line);
}
.panel-head h2 { flex: 1; margin: 0; font-size: 19px; font-weight: 900; }
.panel-art { display: grid; place-items: center; width: 40px; height: 40px; }
.panel-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 14px 14px calc(24px + var(--safe-bottom)); }
.icon-btn {
  display: grid; place-items: center; width: 44px; height: 44px;
  border-radius: 12px; border: 2px solid var(--line); background: var(--paper); cursor: pointer;
}
@keyframes panel-in { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }

/* Cards, chips, bars */
.card { background: var(--paper); border: 2px solid var(--line); border-radius: var(--radius); padding: 14px; margin-bottom: 12px; }
.card h3 { margin: 0 0 8px; font-size: 16px; font-weight: 900; }
.card.warn { border-color: #f0c9bf; background: #fdf1ee; }
.center { text-align: center; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.muted { color: var(--mute); font-size: 14px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 99px; font-size: 13px; font-weight: 800; background: #efe7d6; color: #5b5244; }
.chip.red { background: #fde1da; color: #9b2f1d; }
.chip.yel { background: #fdf0cf; color: #7a5410; }
.chip.grn { background: #dcf1e2; color: #1f6038; }
.chip.gold { background: #fff0c2; color: #7a5505; }
.chip.blue { background: #dcefff; color: #1d5d93; }
.bar { height: 10px; border-radius: 99px; background: #eadfca; overflow: hidden; }
.bar > i { display: block; height: 100%; background: var(--green); border-radius: 99px; }

/* Forms */
select, input[type='text'], textarea { border: 2px solid var(--line); border-radius: 12px; background: #fff; padding: 10px 12px; min-height: 44px; }
textarea { width: 100%; min-height: 120px; font: 13px/1.4 ui-monospace, Consolas, monospace; }
.field-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 8px 0; font-weight: 800; }
.field-row select, .field-row input { flex: 1; max-width: 70%; }

/* Toast + save warning */
.toast {
  position: fixed; left: 50%; bottom: calc(18px + var(--safe-bottom)); transform: translateX(-50%); z-index: 60;
  max-width: min(92vw, 520px); padding: 12px 18px; border-radius: 14px; background: #2b2620; color: #fff;
  font-weight: 700; box-shadow: var(--shadow); animation: toast-in 0.2s ease-out;
}
@keyframes toast-in { from { transform: translate(-50%, 12px); opacity: 0; } }
.save-warn { position: fixed; top: calc(var(--hud-h) + var(--safe-top) + 6px); left: 8px; right: 8px; z-index: 40; padding: 8px 12px; border-radius: 12px; background: #fde1da; color: #9b2f1d; font-weight: 800; font-size: 14px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 7: Write `src/app/panels.tsx`, rewrite `src/app/App.tsx`, update `src/main.tsx`**

`src/app/panels.tsx`:
```tsx
import { Panel } from '../ui/kit';
import type { PanelState } from './panel-types';
import { closePanel } from './store';

export function PanelHost({ panel }: { panel: PanelState }) {
  return <div class="panel-layer">{renderPanel(panel)}</div>;
}

function renderPanel(p: PanelState) {
  switch (p.kind) {
    default:
      return (
        <Panel title="Coming soon" onClose={closePanel}>
          <p class="muted">This part of the farm is still being built.</p>
        </Panel>
      );
  }
}
```

`src/app/App.tsx` (replace the whole file):
```tsx
import { useEffect } from 'preact/hooks';
import { ToastHost } from '../ui/kit';
import { PanelHost } from './panels';
import { panel, save, saveFailed, startClock } from './store';
import '../styles/base.css';

export function App() {
  useEffect(() => startClock(), []);
  const p = panel.value;
  const calm = save.value.settings.batterySaver;
  return (
    <div class={`app${p ? ' has-panel' : ''}${calm ? ' calm' : ''}`}>
      <main class="stage">
        <div class="scene-wrap" />
      </main>
      {p && <PanelHost panel={p} />}
      {saveFailed.value && (
        <div class="save-warn" role="alert">
          Couldn't save on this device. Export a backup in the House.
        </div>
      )}
      <ToastHost />
    </div>
  );
}
```

`src/main.tsx` (replace the whole file):
```tsx
import '@fontsource-variable/nunito';
import { render } from 'preact';
import { App } from './app/App';

render(<App />, document.getElementById('app')!);
```

- [ ] **Step 8: Run all tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: every test file passes (store 4, kit 3, smoke 1, plus all earlier files); tsc exit 0.

- [ ] **Step 9: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: app shell with signals store, design system, panels and synth sounds

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 9: Modern vector art kit (crops × 3 stages, buildings, farmer)

**Files:**
- Create: `src/scene/art.tsx`, `tests/scene/art.test.tsx`

**Interfaces:**
- Consumes: `CropKind`, `ErrorTag` (Task 2); `TOPICS` (Task 2, test only).
- Produces: `CROP_STYLE`, `CROP_KINDS: CropKind[]`, `cropHref(kind, stage): string` (`'#crop-<kind>-<stage>'`), `shade(hex, amt)`, `ArtDefs()` (a `<defs>` with gradients `g-<kind>`, `g-grass`, `g-soil`, `g-water`, `g-roof`, `g-wall`, `g-wood`, `g-rock`, a `#tuft` group, and 63 crop groups), `CropShape({kind, stage})`, `House({night})`, `ShippingBin({count})`, `MineEntrance()`, `Pond()`, `Tree({s?, autumn?})`, `Bush()`, `Flowers({color?})`, `Sign({text, thirsty?, ready?})`, `CalendarBoard({day})`, `Farmer()` (two `.leg` groups and a `.farmer-body` group), `DropBadge()`, `Star()`, `PestDot({tag})`.

Art direction: flat vector with two-tone shading, rounded shapes, and soft ground shadows made from semi-transparent ellipses (no filters). Every crop is drawn around (0, 0), which is the point where the stem meets the soil. Plants grow upward to about y = −56.

- [ ] **Step 1: Write the failing test**

`tests/scene/art.test.tsx`:
```tsx
import { render } from '@testing-library/preact';
import { TOPICS } from '../../src/data/topics';
import { ArtDefs, CROP_KINDS, Farmer, House, cropHref, shade } from '../../src/scene/art';

describe('art kit', () => {
  it('defines three growth stages for every crop kind', () => {
    const { container } = render(
      <svg>
        <ArtDefs />
      </svg>,
    );
    for (const k of CROP_KINDS) for (const st of [1, 2, 3] as const) expect(container.querySelector(cropHref(k, st)), `${k}-${st}`).not.toBeNull();
  });

  it('has art for every topic crop', () => {
    for (const t of Object.values(TOPICS)) expect(CROP_KINDS).toContain(t.crop);
  });

  it('lights the house windows at night', () => {
    const day = render(<svg><House night={false} /></svg>).container.innerHTML;
    const night = render(<svg><House night /></svg>).container.innerHTML;
    expect(day).toContain('#bfe6ff');
    expect(night).toContain('#ffd76a');
  });

  it('draws the farmer with two legs for the walk cycle', () => {
    const { container } = render(<svg><Farmer /></svg>);
    expect(container.querySelectorAll('.leg')).toHaveLength(2);
  });

  it('shades colours lighter and darker', () => {
    expect(shade('#808080', 0.5)).toBe('#c0c0c0');
    expect(shade('#808080', -0.5)).toBe('#404040');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ~/byte-harvest && npx vitest run tests/scene/art.test.tsx`
Expected: FAIL with `Failed to resolve import "../../src/scene/art"`.

- [ ] **Step 3: Write `src/scene/art.tsx`**

```tsx
import type { CropKind, ErrorTag } from '../data/types';

/* ---------- palette & helpers ---------- */

type Family = 'round' | 'cluster' | 'root' | 'stalk' | 'flower' | 'hanging' | 'leafy' | 'gourd' | 'mushroom';

interface CropStyle {
  f: Family;
  c1: string; // produce light
  c2: string; // produce dark
  leaf: string;
}

export const CROP_STYLE: Record<CropKind, CropStyle> = {
  sunflower: { f: 'flower', c1: '#ffd23f', c2: '#f4a300', leaf: '#5aa83c' },
  corn: { f: 'stalk', c1: '#ffd95a', c2: '#e9b213', leaf: '#6cb944' },
  cabbage: { f: 'leafy', c1: '#b5e48c', c2: '#76c043', leaf: '#5aa83c' },
  pumpkin: { f: 'gourd', c1: '#ffa04d', c2: '#e86f12', leaf: '#4f9a37' },
  wheat: { f: 'stalk', c1: '#f3d27a', c2: '#d6a843', leaf: '#9cbf52' },
  tomato: { f: 'round', c1: '#ff6b5b', c2: '#d93a2b', leaf: '#4f9a37' },
  eggplant: { f: 'hanging', c1: '#a173dc', c2: '#6a3fa0', leaf: '#4f9a37' },
  potato: { f: 'root', c1: '#e0bd8c', c2: '#b48653', leaf: '#5aa83c' },
  grape: { f: 'cluster', c1: '#9a88f5', c2: '#5b49c9', leaf: '#5aa83c' },
  carrot: { f: 'root', c1: '#ffa04a', c2: '#e2701a', leaf: '#5fb43f' },
  strawberry: { f: 'round', c1: '#ff6680', c2: '#d8324f', leaf: '#4f9a37' },
  pepper: { f: 'hanging', c1: '#ff6a4a', c2: '#c9301a', leaf: '#4f9a37' },
  rose: { f: 'flower', c1: '#ff7a9c', c2: '#d63a63', leaf: '#3f8a3a' },
  turnip: { f: 'root', c1: '#f6eeff', c2: '#c58be0', leaf: '#5fb43f' },
  onion: { f: 'root', c1: '#f5cd8d', c2: '#c98d43', leaf: '#7cc35a' },
  pea: { f: 'hanging', c1: '#9ae36a', c2: '#5fae2e', leaf: '#4f9a37' },
  melon: { f: 'gourd', c1: '#c4ef94', c2: '#7cbf3f', leaf: '#4f9a37' },
  blueberry: { f: 'cluster', c1: '#7da6ff', c2: '#3c62d6', leaf: '#4f9a37' },
  mushroom: { f: 'mushroom', c1: '#ff8a66', c2: '#d9502e', leaf: '#f6efe2' },
  radish: { f: 'root', c1: '#ff7aab', c2: '#d63f78', leaf: '#5fb43f' },
  bean: { f: 'hanging', c1: '#7fcf68', c2: '#3f8f2e', leaf: '#4f9a37' },
};

export const CROP_KINDS = Object.keys(CROP_STYLE) as CropKind[];
export const cropHref = (kind: CropKind, stage: 1 | 2 | 3) => `#crop-${kind}-${stage}`;

/** amt > 0 mixes toward white, amt < 0 toward black. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const grad = (kind: CropKind) => `url(#g-${kind})`;

function Leaf({ x, y, r, len, w, fill }: { x: number; y: number; r: number; len: number; w: number; fill: string }) {
  return (
    <path
      d={`M0 0C${w} ${-len * 0.35} ${w * 0.6} ${-len * 0.85} 0 ${-len}C${-w * 0.6} ${-len * 0.85} ${-w} ${-len * 0.35} 0 0Z`}
      fill={fill}
      transform={`translate(${x} ${y}) rotate(${r})`}
    />
  );
}

function Fruit({ x, y, r, kind }: { x: number; y: number; r: number; kind: CropKind }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={grad(kind)} />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.32} ry={r * 0.22} fill="#fff" opacity="0.55" />
    </g>
  );
}

function Foliage({ s }: { s: CropStyle }) {
  return (
    <g>
      <ellipse cx="0" cy="-16" rx="20" ry="15" fill={shade(s.leaf, -0.18)} />
      <ellipse cx="-9" cy="-22" rx="12" ry="11" fill={s.leaf} />
      <ellipse cx="9" cy="-24" rx="12" ry="11" fill={shade(s.leaf, 0.1)} />
      <ellipse cx="0" cy="-30" rx="10" ry="8" fill={shade(s.leaf, 0.22)} />
    </g>
  );
}

/* ---------- growth stages ---------- */

function Sprout({ s }: { s: CropStyle }) {
  return (
    <g>
      <path d="M0 0Q1 -7 0 -12" stroke={shade(s.leaf, -0.25)} stroke-width="2.4" fill="none" stroke-linecap="round" />
      <Leaf x={0} y={-10} r={-55} len={12} w={6} fill={s.leaf} />
      <Leaf x={0} y={-10} r={55} len={12} w={6} fill={shade(s.leaf, 0.18)} />
    </g>
  );
}

function Young({ s }: { s: CropStyle }) {
  const dark = shade(s.leaf, -0.15);
  return (
    <g>
      <path d="M0 0Q2 -14 0 -26" stroke={shade(s.leaf, -0.3)} stroke-width="2.8" fill="none" stroke-linecap="round" />
      <Leaf x={0} y={-6} r={-70} len={16} w={8} fill={dark} />
      <Leaf x={0} y={-6} r={70} len={16} w={8} fill={dark} />
      <Leaf x={0} y={-18} r={-40} len={15} w={7} fill={s.leaf} />
      <Leaf x={0} y={-18} r={40} len={15} w={7} fill={shade(s.leaf, 0.15)} />
      <circle cx="0" cy="-27" r="3" fill={s.c1} />
    </g>
  );
}

const CLUSTER: [number, number][] = [[-4, -23], [4, -23], [-8, -17], [0, -17], [8, -17], [-4, -11], [4, -11]];

function Root({ kind, s }: { kind: CropKind; s: CropStyle }) {
  const body =
    kind === 'carrot' ? (
      <g>
        <path d="M-9 -9Q0 -14 9 -9L3 5Q0 8 -3 5Z" fill={grad(kind)} />
        <ellipse cx="-3" cy="-8" rx="2.4" ry="1.6" fill="#fff" opacity="0.45" />
      </g>
    ) : kind === 'potato' ? (
      <g>
        <ellipse cx="-9" cy="-3" rx="8" ry="5.5" fill={grad(kind)} />
        <ellipse cx="8" cy="-2" rx="7" ry="5" fill={grad(kind)} />
        <circle cx="-11" cy="-4" r="0.9" fill={s.c2} />
        <circle cx="7" cy="-3" r="0.9" fill={s.c2} />
      </g>
    ) : (
      <g>
        <ellipse cx="0" cy="-9" rx="10.5" ry="10" fill={grad(kind)} />
        <path d="M0 1q1 4 -1 7" stroke={s.c2} stroke-width="1.6" fill="none" stroke-linecap="round" />
        <ellipse cx="-4" cy="-13" rx="3" ry="2" fill="#fff" opacity="0.45" />
      </g>
    );
  return (
    <g>
      {[-30, -10, 10, 30].map((r, i) => (
        <Leaf key={r} x={0} y={-8} r={r} len={i === 0 || i === 3 ? 20 : 27} w={6} fill={i % 2 ? s.leaf : shade(s.leaf, -0.15)} />
      ))}
      {body}
    </g>
  );
}

function Corn({ s }: { s: CropStyle }) {
  return (
    <g>
      <path d="M0 0L0 -50" stroke={shade(s.leaf, -0.25)} stroke-width="3.5" stroke-linecap="round" />
      <Leaf x={0} y={-8} r={-62} len={26} w={6} fill={shade(s.leaf, -0.12)} />
      <Leaf x={0} y={-16} r={60} len={26} w={6} fill={s.leaf} />
      <Leaf x={0} y={-30} r={-48} len={20} w={5} fill={shade(s.leaf, 0.12)} />
      <g transform="translate(6 -34) rotate(18)">
        <ellipse cx="0" cy="0" rx="5.5" ry="12" fill={grad('corn')} />
        <path d="M-6 6Q-2 -6 0 -13M6 6Q2 -6 0 -13" stroke={shade(s.leaf, -0.1)} stroke-width="3" fill="none" />
      </g>
      <path d="M0 -50l-3 -6M0 -50l3 -6M0 -50l0 -7" stroke="#e3c46a" stroke-width="1.6" stroke-linecap="round" />
    </g>
  );
}

function Wheat({ s }: { s: CropStyle }) {
  return (
    <g>
      {[-10, 0, 10].map((x, i) => (
        <g key={x} transform={`translate(${x} 0) rotate(${(i - 1) * 8})`}>
          <path d="M0 0L0 -40" stroke={shade(s.c2, -0.1)} stroke-width="2" />
          {[0, 1, 2, 3].map((j) => (
            <g key={j}>
              <ellipse cx="-3" cy={-40 + j * 5} rx="2.6" ry="4" fill={s.c1} transform={`rotate(-25 -3 ${-40 + j * 5})`} />
              <ellipse cx="3" cy={-40 + j * 5} rx="2.6" ry="4" fill={s.c2} transform={`rotate(25 3 ${-40 + j * 5})`} />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function FlowerStem({ s }: { s: CropStyle }) {
  return (
    <g>
      <path d="M0 0Q2 -20 0 -38" stroke={shade(s.leaf, -0.25)} stroke-width="3" fill="none" stroke-linecap="round" />
      <Leaf x={0} y={-12} r={-60} len={16} w={8} fill={s.leaf} />
      <Leaf x={0} y={-20} r={60} len={16} w={8} fill={shade(s.leaf, 0.12)} />
    </g>
  );
}

function Sunflower({ s }: { s: CropStyle }) {
  return (
    <g>
      <FlowerStem s={s} />
      <g transform="translate(0 -42)">
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-10" rx="3.6" ry="7" fill={i % 2 ? s.c1 : s.c2} transform={`rotate(${i * 30})`} />
        ))}
        <circle r="7" fill="#7a4a23" />
        <circle r="4.5" fill="#5c3518" />
      </g>
    </g>
  );
}

function Rose({ s }: { s: CropStyle }) {
  return (
    <g>
      <FlowerStem s={s} />
      <path d="M-1 -16l-4 -2M1 -27l4 -2" stroke={shade(s.leaf, -0.35)} stroke-width="1.8" stroke-linecap="round" />
      <g transform="translate(0 -40)">
        <circle r="9" fill={s.c2} />
        <circle cx="-3" cy="-2" r="6" fill={s.c1} />
        <circle cx="3" cy="-1" r="5.5" fill={shade(s.c1, 0.15)} />
        <path d="M-3 0q3 -5 6 0" stroke={s.c2} stroke-width="1.5" fill="none" />
      </g>
    </g>
  );
}

function Hanging({ kind, s }: { kind: CropKind; s: CropStyle }) {
  const pods = kind === 'pea' || kind === 'bean';
  const spots: [number, number, number][] = [[-9, -22, -12], [8, -24, 14], [0, -14, 4]];
  return (
    <g>
      <Foliage s={s} />
      {spots.map(([x, y, r]) => (
        <g key={`${x}${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
          {pods ? (
            <g>
              <path d="M-3 0Q-4 12 0 18Q4 12 3 0Z" fill={grad(kind)} />
              {kind === 'pea' && [4, 9, 14].map((yy) => <circle key={yy} cx="0" cy={yy} r="1.6" fill={shade(s.c1, 0.3)} />)}
            </g>
          ) : (
            <g>
              <path d="M0 0C-7 3 -8 16 0 20C8 16 7 3 0 0Z" fill={grad(kind)} />
              <path d="M-3 0h6l-3 -4z" fill={shade(s.leaf, -0.2)} />
            </g>
          )}
        </g>
      ))}
    </g>
  );
}

function Cabbage({ s }: { s: CropStyle }) {
  return (
    <g>
      <ellipse cx="0" cy="-10" rx="21" ry="12" fill={shade(s.c2, -0.1)} />
      <circle cx="-8" cy="-14" r="10" fill={s.c2} />
      <circle cx="8" cy="-14" r="10" fill={s.c2} />
      <circle cx="0" cy="-17" r="11" fill={grad('cabbage')} />
      <path d="M0 -8Q-2 -16 0 -25M0 -14l-5 -4M0 -18l5 -4" stroke={shade(s.c2, -0.2)} stroke-width="1.3" fill="none" stroke-linecap="round" />
    </g>
  );
}

function Gourd({ kind, s }: { kind: CropKind; s: CropStyle }) {
  return (
    <g>
      <Leaf x={-6} y={-6} r={-70} len={20} w={10} fill={s.leaf} />
      <Leaf x={6} y={-8} r={65} len={18} w={10} fill={shade(s.leaf, 0.12)} />
      <path d="M14 -10q8 -6 6 -14q-2 6 -8 6" stroke={shade(s.leaf, -0.2)} stroke-width="1.8" fill="none" />
      <ellipse cx="0" cy="-10" rx="16" ry="12" fill={grad(kind)} />
      {kind === 'pumpkin' ? (
        <g stroke={shade(s.c2, -0.15)} stroke-width="1.4" fill="none">
          <path d="M-6 -21Q-11 -10 -6 1" />
          <path d="M6 -21Q11 -10 6 1" />
          <path d="M0 -22L0 2" />
        </g>
      ) : (
        <g stroke={shade(s.c2, -0.2)} stroke-width="2" fill="none" opacity="0.7">
          <path d="M-9 -19Q-13 -10 -9 -1" />
          <path d="M0 -22Q-2 -10 0 2" />
          <path d="M9 -19Q13 -10 9 -1" />
        </g>
      )}
      <path d="M0 -22q1 -5 4 -6" stroke="#6b4a2b" stroke-width="2.4" fill="none" stroke-linecap="round" />
      <ellipse cx="-6" cy="-15" rx="4" ry="2.4" fill="#fff" opacity="0.45" />
    </g>
  );
}

function Mushroom({ stage, s }: { stage: 1 | 2 | 3; s: CropStyle }) {
  const k = stage === 1 ? 0.5 : stage === 2 ? 0.75 : 1;
  return (
    <g transform={`scale(${k})`}>
      <path d="M-6 0Q-7 -12 -4 -16L4 -16Q7 -12 6 0Z" fill={s.leaf} />
      <path d="M-17 -14Q-16 -32 0 -33Q16 -32 17 -14Q0 -10 -17 -14Z" fill={grad('mushroom')} />
      <circle cx="-7" cy="-24" r="2.6" fill="#fff" opacity="0.9" />
      <circle cx="5" cy="-27" r="2" fill="#fff" opacity="0.9" />
      <circle cx="9" cy="-19" r="1.8" fill="#fff" opacity="0.9" />
    </g>
  );
}

function Mature({ kind, s }: { kind: CropKind; s: CropStyle }) {
  switch (s.f) {
    case 'round':
      return (
        <g>
          <Foliage s={s} />
          <Fruit x={-10} y={-16} r={6.5} kind={kind} />
          <Fruit x={9} y={-23} r={6.5} kind={kind} />
          <Fruit x={1} y={-9} r={6} kind={kind} />
        </g>
      );
    case 'cluster':
      return (
        <g>
          <Foliage s={s} />
          {CLUSTER.map(([x, y]) => (
            <Fruit key={`${x}${y}`} x={x} y={y} r={4.2} kind={kind} />
          ))}
        </g>
      );
    case 'root':
      return <Root kind={kind} s={s} />;
    case 'stalk':
      return kind === 'corn' ? <Corn s={s} /> : <Wheat s={s} />;
    case 'flower':
      return kind === 'sunflower' ? <Sunflower s={s} /> : <Rose s={s} />;
    case 'hanging':
      return <Hanging kind={kind} s={s} />;
    case 'leafy':
      return <Cabbage s={s} />;
    case 'gourd':
      return <Gourd kind={kind} s={s} />;
    default:
      return <Mushroom stage={3} s={s} />;
  }
}

export function CropShape({ kind, stage }: { kind: CropKind; stage: 1 | 2 | 3 }) {
  const s = CROP_STYLE[kind];
  const body =
    s.f === 'mushroom' ? <Mushroom stage={stage} s={s} /> : stage === 1 ? <Sprout s={s} /> : stage === 2 ? <Young s={s} /> : <Mature kind={kind} s={s} />;
  return (
    <g>
      <ellipse cx="0" cy="1" rx="15" ry="4" fill="#3b2412" opacity="0.18" />
      {body}
    </g>
  );
}

/* ---------- shared <defs> ---------- */

function Linear({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={top} />
      <stop offset="1" stop-color={bottom} />
    </linearGradient>
  );
}

export function ArtDefs() {
  return (
    <defs>
      {CROP_KINDS.map((k) => (
        <radialGradient key={k} id={`g-${k}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stop-color={shade(CROP_STYLE[k].c1, 0.25)} />
          <stop offset="0.55" stop-color={CROP_STYLE[k].c1} />
          <stop offset="1" stop-color={CROP_STYLE[k].c2} />
        </radialGradient>
      ))}
      <Linear id="g-grass" top="#9ad46c" bottom="#78b955" />
      <Linear id="g-soil" top="#a8714a" bottom="#8b5a39" />
      <Linear id="g-water" top="#7fd3f7" bottom="#3aa6e0" />
      <Linear id="g-roof" top="#ef7a5f" bottom="#cf4f3a" />
      <Linear id="g-wall" top="#fff6e3" bottom="#f1dfbd" />
      <Linear id="g-wood" top="#c98f5d" bottom="#a8703f" />
      <Linear id="g-rock" top="#b7aa9b" bottom="#8a7d70" />
      <g id="tuft">
        <path d="M-4 0Q-3 -6 -5 -9M0 0Q0 -7 1 -11M4 0Q3 -6 5 -8" stroke="#6aa94a" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>
      {CROP_KINDS.flatMap((k) =>
        ([1, 2, 3] as const).map((st) => (
          <g key={`${k}-${st}`} id={`crop-${k}-${st}`}>
            <CropShape kind={k} stage={st} />
          </g>
        )),
      )}
    </defs>
  );
}

/* ---------- buildings & decor (each drawn from its own top-left origin) ---------- */

export function House({ night }: { night: boolean }) {
  const win = night ? '#ffd76a' : '#bfe6ff';
  return (
    <g>
      <ellipse cx="95" cy="186" rx="96" ry="10" fill="#3b2412" opacity="0.15" />
      <rect x="18" y="80" width="154" height="104" rx="10" fill="url(#g-wall)" />
      <rect x="18" y="160" width="154" height="24" rx="6" fill="#e3cfa8" />
      <rect x="132" y="30" width="20" height="40" rx="4" fill="#9a6a4b" />
      <rect x="128" y="26" width="28" height="9" rx="3" fill="#7d5238" />
      <g class="ambient">
        <circle class="smoke" cx="142" cy="18" r="7" fill="#fff" opacity="0.7" />
        <circle class="smoke smoke-late" cx="146" cy="14" r="5" fill="#fff" opacity="0.6" />
      </g>
      <path d="M4 92L95 18L186 92Q190 98 182 100L8 100Q0 98 4 92Z" fill="url(#g-roof)" />
      <path d="M30 84L95 32L160 84" stroke="#fff" stroke-opacity="0.22" stroke-width="5" fill="none" stroke-linecap="round" />
      <rect x="78" y="118" width="34" height="66" rx="8" fill="#8a5a3b" />
      <circle cx="104" cy="152" r="3" fill="#f4b63d" />
      <rect x="34" y="114" width="32" height="30" rx="6" fill={win} stroke="#fff" stroke-width="4" />
      <rect x="124" y="114" width="32" height="30" rx="6" fill={win} stroke="#fff" stroke-width="4" />
      <path d="M50 114v30M34 129h32M140 114v30M124 129h32" stroke="#fff" stroke-width="3" />
      <rect x="30" y="146" width="40" height="8" rx="4" fill="#e2583f" />
      <circle cx="38" cy="145" r="4" fill="#ffd23f" />
      <circle cx="50" cy="144" r="4" fill="#ff6f91" />
      <circle cx="62" cy="145" r="4" fill="#ffd23f" />
    </g>
  );
}

export function ShippingBin({ count }: { count: number }) {
  return (
    <g>
      <ellipse cx="30" cy="50" rx="32" ry="6" fill="#3b2412" opacity="0.15" />
      <rect x="2" y="14" width="56" height="36" rx="6" fill="url(#g-wood)" />
      <path d="M2 26h56M2 38h56" stroke="#8a5a3b" stroke-width="2" opacity="0.6" />
      <rect x="-1" y="6" width="62" height="12" rx="5" fill="#b07a4c" />
      {count > 0 && (
        <g transform="translate(54 4)">
          <circle r="11" fill="#e2583f" stroke="#fff" stroke-width="2.5" />
          <text y="4.5" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">
            {count}
          </text>
        </g>
      )}
    </g>
  );
}

export function MineEntrance() {
  return (
    <g>
      <path d="M0 210L10 90L50 40L110 10L170 40L200 100L200 210Z" fill="url(#g-rock)" />
      <path d="M40 60L80 30L120 40L90 70Z" fill="#cfc3b5" opacity="0.6" />
      <path d="M150 70L185 100L170 120Z" fill="#6f655a" opacity="0.5" />
      <path d="M55 210L55 130Q100 80 145 130L145 210Z" fill="#2e2620" />
      <path d="M50 210V128M150 210V128M44 126H156" stroke="#9a6a3f" stroke-width="10" stroke-linecap="round" />
      <path d="M70 210L86 160M130 210L114 160M80 190H120M84 175H116" stroke="#7a5a3c" stroke-width="3" />
      <circle cx="162" cy="160" r="5" fill="#8fd3ff" />
      <circle cx="34" cy="150" r="4" fill="#ffd23f" />
      <circle cx="176" cy="186" r="3.5" fill="#ff8fb1" />
    </g>
  );
}

export function Pond() {
  return (
    <g>
      <ellipse cx="130" cy="50" rx="130" ry="46" fill="#5fae55" />
      <ellipse cx="130" cy="49" rx="117" ry="38" fill="url(#g-water)" />
      <ellipse cx="108" cy="38" rx="56" ry="9" fill="#fff" opacity="0.25" />
      <g class="ambient">
        <ellipse class="ripple" cx="168" cy="56" rx="16" ry="5" fill="none" stroke="#fff" stroke-width="2" opacity="0.6" />
      </g>
      <ellipse cx="60" cy="62" rx="12" ry="7" fill="#4caf50" />
      <ellipse cx="200" cy="42" rx="10" ry="6" fill="#4caf50" />
      <circle cx="202" cy="39" r="3" fill="#ff8fb1" />
      <rect x="222" y="16" width="40" height="12" rx="3" fill="url(#g-wood)" transform="rotate(12 242 22)" />
    </g>
  );
}

export function Tree({ s = 1, autumn = false }: { s?: number; autumn?: boolean }) {
  const c = autumn ? ['#f2a541', '#e07a2e', '#f6c453'] : ['#5aa83c', '#4a9431', '#6cc04a'];
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="0" cy="4" rx="30" ry="8" fill="#3b2412" opacity="0.18" />
      <rect x="-6" y="-30" width="12" height="34" rx="5" fill="#8a5a3b" />
      <circle cx="0" cy="-48" r="30" fill={c[1]} />
      <circle cx="-14" cy="-56" r="18" fill={c[0]} />
      <circle cx="14" cy="-58" r="17" fill={c[2]} />
      <circle cx="2" cy="-70" r="15" fill={c[0]} />
    </g>
  );
}

export function Bush() {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="20" ry="5" fill="#3b2412" opacity="0.15" />
      <circle cx="-9" cy="-8" r="11" fill="#4f9a37" />
      <circle cx="8" cy="-9" r="12" fill="#5fb143" />
      <circle cx="0" cy="-15" r="10" fill="#6cc04a" />
    </g>
  );
}

export function Flowers({ color = '#ff8fb1' }: { color?: string }) {
  const spots: [number, number][] = [[-10, 0], [0, -4], [10, 1]];
  return (
    <g>
      {spots.map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M0 0v8" stroke="#4f9a37" stroke-width="2" />
          <circle r="4" fill={color} />
          <circle r="1.6" fill="#ffe08a" />
        </g>
      ))}
    </g>
  );
}

export function Sign({ text, thirsty = 0, ready = 0 }: { text: string; thirsty?: number; ready?: number }) {
  const textW = Math.round(text.length * 8.4);
  const dropX = 18 + textW;
  const starX = dropX + (thirsty ? 40 : 0);
  const w = starX + (ready ? 40 : 0) + 4;
  return (
    <g>
      <rect x="0" y="0" width={w} height="26" rx="8" fill="url(#g-wood)" stroke="#8a5a3b" stroke-width="2" />
      <text x="11" y="18" font-size="14" font-weight="900" fill="#fffaf0">
        {text}
      </text>
      {thirsty > 0 && (
        <g transform={`translate(${dropX} 4)`}>
          <rect width="36" height="18" rx="9" fill="#fffaf0" />
          <path d="M10 3C8 6 6 8 6 10a4 4 0 0 0 8 0c0-2-2-4-4-7z" fill="#4fb3f0" />
          <text x="25" y="13.5" text-anchor="middle" font-size="12" font-weight="900" fill="#2a77bd">
            {thirsty}
          </text>
        </g>
      )}
      {ready > 0 && (
        <g transform={`translate(${starX} 4)`}>
          <rect width="36" height="18" rx="9" fill="#fffaf0" />
          <path d="M10 3l1.8 3.8 4.2.5-3.1 2.9.8 4.1-3.7-2-3.7 2 .8-4.1-3.1-2.9 4.2-.5z" fill="#f4b63d" />
          <text x="25" y="13.5" text-anchor="middle" font-size="12" font-weight="900" fill="#a46d00">
            {ready}
          </text>
        </g>
      )}
    </g>
  );
}

export function CalendarBoard({ day }: { day: number }) {
  return (
    <g>
      <rect x="16" y="34" width="6" height="30" fill="#8a5a3b" />
      <rect x="0" y="0" width="38" height="38" rx="6" fill="#fffaf0" stroke="#8a5a3b" stroke-width="3" />
      <rect x="0" y="0" width="38" height="11" rx="5" fill="#e2583f" />
      <text x="19" y="31" text-anchor="middle" font-size="17" font-weight="900" fill="#2b2620">
        {day}
      </text>
    </g>
  );
}

/** Drawn with its feet at (0, 0). The walk cycle animates `.leg` and `.farmer-body` via CSS. */
export function Farmer() {
  return (
    <g class="farmer-body">
      <ellipse cx="0" cy="2" rx="14" ry="4" fill="#3b2412" opacity="0.22" />
      <g class="leg leg-l">
        <rect x="-7" y="-14" width="6" height="14" rx="3" fill="#2f4858" />
      </g>
      <g class="leg leg-r">
        <rect x="1" y="-14" width="6" height="14" rx="3" fill="#2f4858" />
      </g>
      <rect x="-10" y="-30" width="20" height="19" rx="7" fill="#2a9d8f" />
      <rect x="-8" y="-24" width="16" height="13" rx="4" fill="#3d5a80" />
      <circle cx="0" cy="-38" r="10" fill="#f2c9a0" />
      <path d="M-10 -40Q-9 -50 0 -50Q9 -50 10 -40Q5 -44 0 -44Q-5 -44 -10 -40Z" fill="#5b3a29" />
      <ellipse cx="0" cy="-45" rx="17" ry="4.5" fill="#e9c46a" />
      <path d="M-9 -45Q-8 -56 0 -56Q8 -56 9 -45Z" fill="#f2d27c" />
      <rect x="-9" y="-48" width="18" height="3.5" fill="#d1495b" />
      <circle cx="-3.5" cy="-37" r="1.4" fill="#2b2620" />
      <circle cx="3.5" cy="-37" r="1.4" fill="#2b2620" />
      <path d="M-2.5 -33Q0 -31 2.5 -33" stroke="#a0522d" stroke-width="1.2" fill="none" stroke-linecap="round" />
      <circle cx="-6" cy="-34" r="2" fill="#ff9e9e" opacity="0.5" />
      <circle cx="6" cy="-34" r="2" fill="#ff9e9e" opacity="0.5" />
    </g>
  );
}

export function DropBadge() {
  return (
    <g>
      <circle r="11" fill="#fff" stroke="#4fb3f0" stroke-width="2.5" />
      <path d="M0 -6.5C-3 -2 -5 0.5 -5 2.5a5 5 0 0 0 10 0C5 0.5 3 -2 0 -6.5Z" fill="#4fb3f0" />
    </g>
  );
}

export function Star() {
  return <path d="M0 -9L2.6 -2.6L9 -2.2L4 2L5.6 8.6L0 5L-5.6 8.6L-4 2L-9 -2.2L-2.6 -2.6Z" fill="#ffd23f" stroke="#fff" stroke-width="1.5" />;
}

const PEST_COLOR: Record<ErrorTag, string> = { K: '#7b4fd6', C: '#e2583f', N: '#3a9a5b', M: '#8a5a3b', T: '#3d9be9' };

export function PestDot({ tag }: { tag: ErrorTag }) {
  return (
    <g>
      <circle r="7.5" fill={PEST_COLOR[tag]} stroke="#fff" stroke-width="2" />
      <text y="3.5" text-anchor="middle" font-size="9.5" font-weight="900" fill="#fff">
        {tag}
      </text>
    </g>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd ~/byte-harvest && npx vitest run tests/scene/art.test.tsx && npm run typecheck`
Expected: `5 passed`, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: code-drawn vector art — 21 crops × 3 stages, buildings, farmer

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: The interactive farm scene

**Files:**
- Create: `src/scene/layout.ts`, `src/scene/useWalker.ts`, `src/scene/Farm.tsx`, `src/scene/scene.css`, `src/ui/actions.ts`, `tests/scene/layout.test.ts`, `tests/scene/farm.test.tsx`
- Modify: `src/app/App.tsx` (render `<Farm>` in place of the empty `.scene-wrap`)

**Interfaces:**
- Consumes: store (`save`, `now`, `today`, `openPanel`, `showToast`, `update`) from Task 8; `sfx`, `buzz` (Task 8); `cropsInField`, `isThirsty`, `readyCrops`, `dueCrops`, `harvestCrop` (Task 5); `formatDay` (Task 3); `FIELDS`, `CROP_NAMES`, `topicInfo` (Task 2); `mulberry32` (Task 6); everything in `art.tsx` (Task 9).
- Produces:
  - `layout.ts`: `WORLD {w:600,h:1200}`, `CELL {w:66,h:64}`, `FieldLayout {x,y,cols,rows,signY}`, `FIELD_LAYOUT: Record<FieldId, FieldLayout>`, `capacity(f)`, `cellCenter(f, i): {x,y}`, `LANDMARKS` (`house`, `bin`, `calendar`, `mine`, `pond`, each with `x`, `y`, and optionally `stand`), `FARMER_HOME`, `nightLevel(hour): number`, `TUFTS: {x,y}[]`.
  - `useWalker(start, instant): {ref, walkTo(x, y, done?), initial}`.
  - `Farm({paused}: {paused: boolean})`: the SVG has `aria-label="Farm"`; every crop is `<a role="button" data-crop="<crop id>" aria-label="<crop name>, <topic>: <status>">`.
  - `actions.ts`: `waterCrop(c)`, `waterAll()`, `harvestOne(id): number`, `shipAll(): number`.

- [ ] **Step 1: Write the failing tests**

`tests/scene/layout.test.ts`:
```ts
import { CELL, FIELD_LAYOUT, WORLD, capacity, cellCenter, nightLevel } from '../../src/scene/layout';

describe('farm layout', () => {
  it('keeps every field (sign + frame) inside the world without overlaps', () => {
    const rects = Object.values(FIELD_LAYOUT).map((f) => ({
      x1: f.x - 6,
      y1: f.signY,
      x2: f.x + f.cols * CELL.w + 6,
      y2: f.y + f.rows * CELL.h + 6,
    }));
    for (const r of rects) {
      expect(r.x1).toBeGreaterThanOrEqual(0);
      expect(r.x2).toBeLessThanOrEqual(WORLD.w);
      expect(r.y2).toBeLessThanOrEqual(WORLD.h);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        expect(a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2).toBe(false);
      }
    }
  });

  it('places every cell centre inside its field', () => {
    for (const f of Object.values(FIELD_LAYOUT)) {
      for (let i = 0; i < capacity(f); i++) {
        const p = cellCenter(f, i);
        expect(p.x).toBeGreaterThan(f.x);
        expect(p.x).toBeLessThan(f.x + f.cols * CELL.w);
        expect(p.y).toBeGreaterThan(f.y);
        expect(p.y).toBeLessThan(f.y + f.rows * CELL.h);
      }
    }
  });

  it('dims the farm at night but not at noon', () => {
    expect(nightLevel(12)).toBe(0);
    expect(nightLevel(22)).toBeCloseTo(0.38);
    expect(nightLevel(18)).toBeCloseTo(0.19);
    expect(nightLevel(6)).toBeCloseTo(0.19);
  });
});
```

`tests/scene/farm.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { now, panel, save, toast } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import type { Crop } from '../../src/core/state';
import { Farm } from '../../src/scene/Farm';
import { makeCrop } from '../helpers';

const farmWith = (crops: Crop[]) => {
  save.value = { ...defaultSave(), crops: Object.fromEntries(crops.map((c) => [c.id, c])) };
  return render(<Farm paused={false} />);
};

beforeEach(() => {
  now.value = new Date(2026, 9, 17, 10, 0).getTime();
  panel.value = null;
});

describe('farm scene', () => {
  it('draws a thirsty crop that opens a watering session', () => {
    farmWith([makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-17' })]);
    fireEvent.click(screen.getByRole('button', { name: /^carrot, Number & logic: thirsty/ }));
    expect(panel.value).toEqual({ kind: 'session', ids: ['2025S_A_Q01'], mode: 'review', title: 'Watering' });
  });

  it('harvests a ready crop for gold', () => {
    farmWith([makeCrop({ ref: '2025S_A_Q03', topic: 'System strategy', stage: 3, sbw: true })]);
    fireEvent.click(screen.getByRole('button', { name: /^corn, System strategy: ready to harvest/ }));
    expect(save.value.gold).toBe(40);
    expect(save.value.crops).toEqual({});
    expect(toast.value?.text).toBe('Harvested! +40 gold');
  });

  it('says when a growing crop needs water next', () => {
    farmWith([makeCrop({ ref: '2025S_A_Q04', topic: 'Hardware & CPU', stage: 2, last: '2026-10-17', due: '2026-10-19' })]);
    fireEvent.click(screen.getByRole('button', { name: /^tomato, Hardware & CPU: growing/ }));
    expect(toast.value?.text).toBe('Growing — water it again Mon Oct 19.');
  });

  it('shows "+N" when a field overflows', () => {
    farmWith(Array.from({ length: 10 }, (_, i) => makeCrop({ ref: `2025S_A_X${i}`, topic: 'Security' })));
    expect(screen.getByRole('button', { name: /^3 more crops in Thorn Hedge/ })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-crop]')).toHaveLength(7);
  });

  it('opens the pond, mine, house and field panels', () => {
    farmWith([]);
    fireEvent.click(screen.getByRole('button', { name: /^Pond/ }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'A' });
    fireEvent.click(screen.getByRole('button', { name: /^Mine/ }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'B' });
    fireEvent.click(screen.getByRole('button', { name: /^House/ }));
    expect(panel.value).toEqual({ kind: 'house' });
    fireEvent.click(screen.getByRole('button', { name: /^Market Garden:/ }));
    expect(panel.value).toEqual({ kind: 'field', field: 'strategy' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/scene`
Expected: FAIL with `Failed to resolve import "../../src/scene/layout"` and `.../Farm`. The art test still passes.

- [ ] **Step 3: Write `src/scene/layout.ts`**

```ts
import { mulberry32 } from '../core/rng';
import type { FieldId } from '../data/types';

export const WORLD = { w: 600, h: 1200 };
export const CELL = { w: 66, h: 64 };

export interface FieldLayout {
  x: number;
  y: number;
  cols: number;
  rows: number;
  signY: number;
}

/* House, bin, calendar and mine sit along the top (y 36–250); the pond is at the bottom (y 1100–1196). */
export const FIELD_LAYOUT: Record<FieldId, FieldLayout> = {
  strategy: { x: 36, y: 318, cols: 8, rows: 3, signY: 286 },
  tech: { x: 36, y: 554, cols: 8, rows: 3, signY: 522 },
  security: { x: 24, y: 790, cols: 4, rows: 2, signY: 758 },
  devdb: { x: 312, y: 790, cols: 4, rows: 2, signY: 758 },
  code: { x: 36, y: 962, cols: 8, rows: 2, signY: 930 },
};

export const capacity = (f: FieldLayout) => f.cols * f.rows;

/** Where a crop's soil point sits inside cell i (row-major). */
export function cellCenter(f: FieldLayout, i: number): { x: number; y: number } {
  const col = i % f.cols;
  const row = Math.floor(i / f.cols);
  return { x: f.x + col * CELL.w + CELL.w / 2, y: f.y + row * CELL.h + CELL.h - 12 };
}

export const LANDMARKS = {
  house: { x: 20, y: 46, stand: { x: 115, y: 262 } },
  bin: { x: 226, y: 196, stand: { x: 256, y: 268 } },
  calendar: { x: 300, y: 182 },
  mine: { x: 392, y: 36, stand: { x: 492, y: 262 } },
  pond: { x: 20, y: 1100, stand: { x: 150, y: 1094 } },
};

export const FARMER_HOME = { x: 160, y: 266 };

/** 0 by day, up to 0.38 at night, easing over 17–19 h and 5–7 h. */
export function nightLevel(hour: number): number {
  const MAX = 0.38;
  if (hour >= 7 && hour < 17) return 0;
  if (hour >= 19 || hour < 5) return MAX;
  if (hour >= 17) return ((hour - 17) / 2) * MAX;
  return ((7 - hour) / 2) * MAX;
}

const rng = mulberry32(2026);
export const TUFTS = Array.from({ length: 70 }, () => ({ x: Math.round(rng() * WORLD.w), y: Math.round(rng() * WORLD.h) }));
```

- [ ] **Step 4: Write `src/scene/useWalker.ts`**

```ts
import { useRef } from 'preact/hooks';

export interface Point {
  x: number;
  y: number;
}

/** Moves the farmer <g> by writing its transform directly (no re-render per frame). */
export function useWalker(start: Point, instant: () => boolean) {
  const ref = useRef<SVGGElement>(null);
  const pos = useRef<Point>({ ...start });
  const frame = useRef(0);

  const place = (p: Point, facing: number) => {
    ref.current?.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${facing} 1)`);
  };

  function walkTo(x: number, y: number, done?: () => void) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current);
    const from = { ...pos.current };
    const dx = x - from.x;
    const dy = y - from.y;
    const facing = dx < 0 ? -1 : 1;
    const dist = Math.hypot(dx, dy);
    if (instant() || dist < 4 || typeof requestAnimationFrame !== 'function') {
      pos.current = { x, y };
      place(pos.current, facing);
      done?.();
      return;
    }
    const duration = Math.min(380, 120 + dist * 0.6);
    const t0 = performance.now();
    ref.current?.classList.add('walking');
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      pos.current = { x: from.x + dx * e, y: from.y + dy * e };
      place(pos.current, facing);
      if (k < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        ref.current?.classList.remove('walking');
        done?.();
      }
    };
    frame.current = requestAnimationFrame(step);
  }

  return { ref, walkTo, initial: `translate(${start.x} ${start.y})` };
}
```

- [ ] **Step 5: Write `src/ui/actions.ts`**

```ts
import { buzz, sfx } from '../app/feedback';
import { openPanel, save, showToast, today, update } from '../app/store';
import { dueCrops, harvestCrop, readyCrops } from '../core/srs';
import type { Crop } from '../core/state';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function waterCrop(c: Crop): void {
  if (c.kind !== 'paper') return;
  openPanel({ kind: 'session', ids: [c.ref], mode: 'review', title: 'Watering' });
}

export function waterAll(): void {
  const ids = dueCrops(save.value, today.value)
    .filter((c) => c.kind === 'paper')
    .map((c) => c.ref);
  if (!ids.length) {
    showToast('No thirsty crops right now.');
    return;
  }
  openPanel({ kind: 'session', ids, mode: 'review', title: 'Watering' });
}

export function harvestOne(id: string): number {
  const t = today.value;
  const r = update((s) => harvestCrop(s, id, t));
  if (r.ok) {
    sfx('harvest');
    buzz(20);
    showToast(`Harvested! +${r.gold} gold`);
  }
  return r.gold;
}

export function shipAll(): number {
  const t = today.value;
  const ready = readyCrops(save.value);
  if (!ready.length) {
    showToast('Nothing is ready yet. Water thirsty crops on later days.');
    return 0;
  }
  const gold = update((s) => ready.reduce((sum, c) => sum + harvestCrop(s, c.id, t).gold, 0));
  sfx('harvest');
  buzz(30);
  showToast(`Shipped ${plural(ready.length, 'crop')} · +${gold} gold`);
  return gold;
}
```

- [ ] **Step 6: Write `src/scene/scene.css`**

```css
.farm-svg { display: block; width: 100%; height: 100%; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.farm-svg text { font-family: var(--font); pointer-events: none; }
.tap { cursor: pointer; outline: none; }
.tap:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

/* Walk cycle: legs swing, body bobs. */
.leg { transform-box: fill-box; transform-origin: 50% 0%; }
.farmer.walking .leg-l { animation: swing 0.3s ease-in-out infinite alternate; }
.farmer.walking .leg-r { animation: swing 0.3s ease-in-out infinite alternate-reverse; }
.farmer.walking .farmer-body { animation: bob 0.3s ease-in-out infinite alternate; }
@keyframes swing { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes bob { to { transform: translateY(-2px); } }

/* Ready crops sway; badges twinkle. (Animated classes sit on children without a transform attribute.) */
.crop.ready .crop-art { transform-box: fill-box; transform-origin: 50% 100%; animation: sway 2.6s ease-in-out infinite; }
@keyframes sway { 0%, 100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
.sparkle { transform-box: fill-box; transform-origin: center; animation: twinkle 1.6s ease-in-out infinite; }
@keyframes twinkle { 0%, 100% { opacity: 0.35; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1.1); } }

/* Ambient life */
.ripple { transform-box: fill-box; transform-origin: center; animation: ripple 3s ease-out infinite; }
@keyframes ripple { from { transform: scale(0.6); opacity: 0.8; } to { transform: scale(1.6); opacity: 0; } }
.smoke { transform-box: fill-box; transform-origin: center; animation: smoke 4s ease-out infinite; }
.smoke-late { animation-delay: 2s; }
@keyframes smoke { from { transform: translate(0, 0) scale(0.6); opacity: 0.7; } to { transform: translate(8px, -40px) scale(1.4); opacity: 0; } }
.leaf-fall { animation: fall 9s linear infinite; }
@keyframes fall {
  from { transform: translate(0, -40px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  to { transform: translate(-80px, 1300px) rotate(540deg); opacity: 0.9; }
}

/* Calm the scene while a panel is open, in battery saver, or with reduced motion. */
.farm-svg.paused *, .app.calm .farm-svg * { animation-play-state: paused !important; }
.app.calm .ambient { display: none; }
.night-veil { transition: opacity 1s; }
```

- [ ] **Step 7: Write `src/scene/Farm.tsx`**

```tsx
import { now, openPanel, save, showToast, today } from '../app/store';
import { formatDay } from '../core/dates';
import { cropsInField, isThirsty, readyCrops } from '../core/srs';
import type { Crop } from '../core/state';
import { CROP_NAMES, FIELDS, topicInfo } from '../data/topics';
import type { FieldId } from '../data/types';
import { harvestOne, shipAll, waterCrop } from '../ui/actions';
import {
  ArtDefs, Bush, CalendarBoard, DropBadge, Farmer, Flowers, House, MineEntrance,
  PestDot, Pond, ShippingBin, Sign, Star, Tree, cropHref,
} from './art';
import { CELL, FARMER_HOME, FIELD_LAYOUT, LANDMARKS, TUFTS, WORLD, capacity, cellCenter, nightLevel } from './layout';
import { useWalker } from './useWalker';
import './scene.css';

const pd = (fn: () => void) => (e: Event) => {
  e.preventDefault();
  fn();
};

function reducedMotion(batterySaver: boolean): boolean {
  if (batterySaver || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface CropSpriteProps {
  crop: Crop;
  x: number;
  y: number;
  today: string;
  onTap: (c: Crop, x: number, y: number) => void;
}

function CropSprite({ crop, x, y, today, onTap }: CropSpriteProps) {
  const info = topicInfo(crop.topic);
  const ready = crop.stage === 3;
  const thirsty = !ready && isThirsty(crop, today);
  const status = ready ? 'ready to harvest' : thirsty ? 'thirsty — tap to water' : `growing, water again ${formatDay(crop.due)}`;
  return (
    <a
      class={`tap crop${ready ? ' ready' : ''}${thirsty ? ' thirsty' : ''}`}
      href="#"
      role="button"
      data-crop={crop.id}
      aria-label={`${CROP_NAMES[info.crop]}, ${crop.topic}: ${status}${crop.sbw ? ' (golden)' : ''}`}
      onClick={pd(() => onTap(crop, x, y))}
    >
      <g transform={`translate(${x} ${y})`}>
        <rect x="-32" y="-54" width="64" height="62" fill="transparent" />
        {crop.sbw && <ellipse cx="0" cy="2" rx="21" ry="6.5" fill="none" stroke="#f4b63d" stroke-width="3" />}
        <g class="crop-art">
          <use href={cropHref(info.crop, crop.stage)} />
        </g>
        {thirsty && (
          <g transform="translate(17 -44)">
            <DropBadge />
          </g>
        )}
        {ready && (
          <g transform="translate(-17 -42)">
            <g class="sparkle">
              <Star />
            </g>
          </g>
        )}
        {crop.pest && !ready && (
          <g transform="translate(-19 -8)">
            <PestDot tag={crop.pest} />
          </g>
        )}
      </g>
    </a>
  );
}

interface FieldProps {
  field: FieldId;
  name: string;
  crops: Crop[];
  today: string;
  onCrop: (c: Crop, x: number, y: number) => void;
  onOpen: () => void;
}

function Field({ field, name, crops, today, onCrop, onOpen }: FieldProps) {
  const L = FIELD_LAYOUT[field];
  const cap = capacity(L);
  const overflow = crops.length > cap;
  const shown = overflow ? crops.slice(0, cap - 1) : crops;
  const w = L.cols * CELL.w;
  const h = L.rows * CELL.h;
  const thirsty = crops.filter((c) => isThirsty(c, today)).length;
  const ready = crops.filter((c) => c.stage === 3).length;
  const more = crops.length - (cap - 1);
  const last = cellCenter(L, cap - 1);
  return (
    <g>
      <rect x={L.x - 6} y={L.y - 6} width={w + 12} height={h + 12} rx="14" fill="#c08a5a" />
      <rect x={L.x} y={L.y} width={w} height={h} rx="10" fill="url(#g-soil)" />
      {Array.from({ length: L.rows - 1 }, (_, r) => (
        <path key={r} d={`M${L.x + 8} ${L.y + (r + 1) * CELL.h}H${L.x + w - 8}`} stroke="#6f4429" stroke-width="2" opacity="0.3" />
      ))}
      {Array.from({ length: cap }, (_, i) => {
        const p = cellCenter(L, i);
        return <ellipse key={i} cx={p.x} cy={p.y + 2} rx="22" ry="7" fill="#b98258" opacity="0.5" />;
      })}
      <a class="tap" href="#" role="button" aria-label={`${name}: ${crops.length} crops, ${thirsty} thirsty, ${ready} ready — open field`} onClick={pd(onOpen)}>
        <g transform={`translate(${L.x} ${L.signY})`}>
          <Sign text={name} thirsty={thirsty} ready={ready} />
        </g>
      </a>
      {shown.map((c, i) => {
        const p = cellCenter(L, i);
        return <CropSprite key={c.id} crop={c} x={p.x} y={p.y} today={today} onTap={onCrop} />;
      })}
      {overflow && (
        <a class="tap" href="#" role="button" aria-label={`${more} more crops in ${name} — open field`} onClick={pd(onOpen)}>
          <g transform={`translate(${last.x} ${last.y - 18})`}>
            <circle r="18" fill="#fffaf0" stroke="#c08a5a" stroke-width="3" />
            <text y="5" text-anchor="middle" font-size="14" font-weight="900" fill="#6b4329">
              +{more}
            </text>
          </g>
        </a>
      )}
    </g>
  );
}

const OUTSKIRT_TREES: [number, number, number, boolean][] = [
  [-60, 200, 1.1, true], [-40, 640, 1, false], [-70, 980, 1.2, true], [660, 330, 1.1, false],
  [645, 760, 1, true], [670, 1120, 1.2, false], [-30, 1190, 0.9, false], [630, 40, 0.9, true],
];
const LEAF_COLORS = ['#f2a541', '#e07a2e', '#f6c453', '#d9643a', '#f2a541'];

export function Farm({ paused }: { paused: boolean }) {
  const s = save.value;
  const t = today.value;
  const clock = new Date(now.value);
  const night = nightLevel(clock.getHours() + clock.getMinutes() / 60);
  const walker = useWalker(FARMER_HOME, () => reducedMotion(s.settings.batterySaver));
  const ready = readyCrops(s).length;
  const walkThen = (x: number, y: number, then: () => void) => walker.walkTo(x, y, then);

  const tapCrop = (c: Crop, x: number, y: number) =>
    walkThen(x, y + 16, () => {
      if (c.stage === 3) harvestOne(c.id);
      else if (isThirsty(c, today.value)) waterCrop(c);
      else showToast(`Growing — water it again ${formatDay(c.due)}.`);
    });

  return (
    <div class="scene-wrap">
      <svg class={`farm-svg${paused ? ' paused' : ''}`} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} preserveAspectRatio="xMidYMid meet" aria-label="Farm">
        <ArtDefs />
        <rect x="-700" y="-400" width="2000" height="2000" fill="url(#g-grass)" />
        {TUFTS.map((p, i) => (
          <use key={i} href="#tuft" x={p.x} y={p.y} />
        ))}
        <rect x="-700" y="250" width="2000" height="32" rx="16" fill="#ead6a6" />
        <rect x="-700" y="1094" width="2000" height="8" rx="4" fill="#ead6a6" />
        {OUTSKIRT_TREES.map(([x, y, k, autumn]) => (
          <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
            <Tree s={k} autumn={autumn} />
          </g>
        ))}

        <a class="tap" href="#" role="button" aria-label="House — diary, sleep, backup and settings"
          onClick={pd(() => walkThen(LANDMARKS.house.stand.x, LANDMARKS.house.stand.y, () => openPanel({ kind: 'house' })))}>
          <g transform={`translate(${LANDMARKS.house.x} ${LANDMARKS.house.y})`}>
            <House night={night > 0.15} />
          </g>
        </a>
        <a class="tap" href="#" role="button" aria-label={`Shipping bin — ship ${ready} ready crops`}
          onClick={pd(() => walkThen(LANDMARKS.bin.stand.x, LANDMARKS.bin.stand.y, shipAll))}>
          <g transform={`translate(${LANDMARKS.bin.x} ${LANDMARKS.bin.y})`}>
            <ShippingBin count={ready} />
          </g>
        </a>
        <a class="tap" href="#" role="button" aria-label="Calendar board — today's plan" onClick={pd(() => openPanel({ kind: 'almanac' }))}>
          <g transform={`translate(${LANDMARKS.calendar.x} ${LANDMARKS.calendar.y})`}>
            <CalendarBoard day={Number(t.slice(8))} />
          </g>
        </a>
        <a class="tap" href="#" role="button" aria-label="Mine — Subject B questions"
          onClick={pd(() => walkThen(LANDMARKS.mine.stand.x, LANDMARKS.mine.stand.y, () => openPanel({ kind: 'practice', subject: 'B' })))}>
          <g transform={`translate(${LANDMARKS.mine.x} ${LANDMARKS.mine.y})`}>
            <MineEntrance />
          </g>
        </a>

        {FIELDS.map((f) => (
          <Field key={f.id} field={f.id} name={f.name} crops={cropsInField(s, f.id, t)} today={t} onCrop={tapCrop}
            onOpen={() => openPanel({ kind: 'field', field: f.id })} />
        ))}

        <a class="tap" href="#" role="button" aria-label="Pond — fish Subject A questions"
          onClick={pd(() => walkThen(LANDMARKS.pond.stand.x, LANDMARKS.pond.stand.y, () => openPanel({ kind: 'practice', subject: 'A' })))}>
          <g transform={`translate(${LANDMARKS.pond.x} ${LANDMARKS.pond.y})`}>
            <Pond />
          </g>
        </a>
        <g transform="translate(548 1186)"><Tree s={0.85} autumn /></g>
        <g transform="translate(372 1150)"><Flowers color="#ff8fb1" /></g>
        <g transform="translate(430 1176)"><Flowers color="#ffd23f" /></g>
        <g transform="translate(486 1132)"><Bush /></g>
        <g transform="translate(400 1190)"><Bush /></g>

        <g ref={walker.ref} class="farmer" transform={walker.initial}>
          <Farmer />
        </g>

        <g class="ambient" pointer-events="none">
          {[70, 190, 330, 450, 560].map((x, i) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <path class="leaf-fall" style={{ animationDelay: `${i * 1.8}s` }} d="M0 0C4 -4 10 -2 10 4C6 6 2 6 0 0Z" fill={LEAF_COLORS[i]} />
            </g>
          ))}
        </g>
        <rect class="night-veil" x="-700" y="-400" width="2000" height="2000" fill="#141c4a" opacity={night} pointer-events="none" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 8: Render the farm in `src/app/App.tsx`**

Add the import below the existing imports:
```tsx
import { Farm } from '../scene/Farm';
```
Replace:
```tsx
        <div class="scene-wrap" />
```
with:
```tsx
        <Farm paused={!!p} />
```

- [ ] **Step 9: Run all tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: all files pass (layout 3, farm 5, art 5, plus earlier); tsc exit 0.

- [ ] **Step 10: Look at it**

Run this as one command (the dev server starts, gets screenshotted, and stops):
```bash
cd ~/byte-harvest
npx playwright install chromium
./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort > /tmp/bh-dev.log 2>&1 &
SERVER=$!
sleep 4
npx playwright screenshot --viewport-size=360,800 http://127.0.0.1:5173/byte-harvest/ /tmp/farm-mobile.png
npx playwright screenshot --viewport-size=1366,768 http://127.0.0.1:5173/byte-harvest/ /tmp/farm-desktop.png
kill $SERVER
```
(Stop the server by its PID. Never use `pkill -f` with a pattern that appears in your own command line, because it kills the shell running it.)
(This needs the one-time browser libraries from "One-time machine setup". If Chromium fails with `libnspr4.so: cannot open shared object file`, that setup hasn't been done yet.)
Then open both PNGs with the Read tool.
Expected: an empty strip at the top (the HUD arrives in Task 11); house, calendar, bin and mine along the top; five wooden-framed soil fields with signs (Market Garden, Tech Orchard, Thorn Hedge, Greenhouse, Code Garden); the pond at the bottom; the farmer on the path. On the PC shot, grass and trees fill the sides. Nothing overlaps or gets clipped. Fix any layout problem in `layout.ts` before committing.

- [ ] **Step 11: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: interactive SVG farm — fields, crops, landmarks, walking farmer, day/night

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 11: HUD and the daily almanac

**Files:**
- Create: `src/ui/Hud.tsx`, `src/ui/hud.css`, `src/ui/Almanac.tsx`, `src/ui/almanac.css`, `tests/ui/hud.test.tsx`, `tests/ui/almanac.test.tsx`, `tests/app/app.test.tsx`
- Modify: `src/app/App.tsx` (full rewrite below), `src/app/panels.tsx` (add the `almanac` case)

**Interfaces:**
- Consumes: store (`save`, `today`, `panel`, `openPanel`, `closePanel`, `update`) (Task 8); `daysToExam`, `formatDay` (Task 3); `dueCrops`, `readyCrops` (Task 5); `PLAN`, `planFor`, `Suggestion` (Task 3); `waterAll` (Task 10); `Button`, `Chip`, `Panel`, `CoinIcon`, `DropIcon` (Task 8); `Farm` (Task 10).
- Produces: `Hud()`, a header with `button[aria-label^="Open almanac"]`, `button[aria-label="Water N thirsty crops"]`, `[aria-label="N gold"]`, and a `<span class="hud-spacer" />` that Task 15 replaces. `AlmanacPanel()` (dialog "Almanac"). `App` now opens the almanac automatically on the first visit of each local day (`save.seenAlmanac`).

- [ ] **Step 1: Write the failing tests**

`tests/ui/hud.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { Hud } from '../../src/ui/Hud';
import { makeCrop } from '../helpers';

beforeEach(() => {
  now.value = new Date(2026, 9, 16, 9, 0).getTime();
  panel.value = null;
  save.value = defaultSave();
});

describe('HUD', () => {
  it('shows the day, the festival countdown and gold', () => {
    save.value = { ...defaultSave(), gold: 120 };
    render(<Hud />);
    expect(screen.getByRole('button', { name: /^Open almanac/ })).toHaveTextContent('Fri Oct 16D-9 · Festival');
    expect(screen.getByLabelText('120 gold')).toBeInTheDocument();
  });

  it('disables watering when nothing is thirsty', () => {
    render(<Hud />);
    expect(screen.getByRole('button', { name: 'Water 0 thirsty crops' })).toBeDisabled();
  });

  it('starts one watering session for all thirsty crops, golden first', () => {
    save.value = {
      ...defaultSave(),
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-15' }),
        'paper:2025S_A_Q03': makeCrop({ ref: '2025S_A_Q03', topic: 'System strategy', due: '2026-10-16', sbw: true }),
      },
    };
    render(<Hud />);
    fireEvent.click(screen.getByRole('button', { name: 'Water 2 thirsty crops' }));
    expect(panel.value).toEqual({ kind: 'session', ids: ['2025S_A_Q03', '2025S_A_Q01'], mode: 'review', title: 'Watering' });
  });
});
```

`tests/ui/almanac.test.tsx`:
```tsx
import { fireEvent, render, screen, within } from '@testing-library/preact';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { AlmanacPanel } from '../../src/ui/Almanac';

beforeEach(() => {
  panel.value = null;
  save.value = defaultSave();
});

describe('almanac', () => {
  it("shows today's plan, the countdown and suggestions", () => {
    now.value = new Date(2026, 9, 16, 8, 0).getTime();
    render(<AlmanacPanel />);
    expect(screen.getByRole('dialog', { name: 'Almanac' })).toHaveTextContent('Management blitz');
    expect(screen.getByText('9 days to the Harvest Festival')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fish: strategy & management' }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'A', area: 'strategy' });
  });

  it('highlights today in the 10-day strip', () => {
    now.value = new Date(2026, 9, 20, 8, 0).getTime();
    render(<AlmanacPanel />);
    const days = within(screen.getByRole('list', { name: 'Days to the festival' })).getAllByRole('listitem');
    expect(days).toHaveLength(10);
    expect(days[4]).toHaveClass('today');
    expect(days[0]).toHaveClass('past');
  });
});
```

`tests/app/app.test.tsx`:
```tsx
import { render, screen } from '@testing-library/preact';
import { App } from '../../src/app/App';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';

describe('app', () => {
  it('opens the almanac on the first visit of the day only', () => {
    now.value = new Date(2026, 9, 16, 8, 0).getTime();
    save.value = defaultSave();
    panel.value = null;
    const first = render(<App />);
    expect(screen.getByRole('dialog', { name: 'Almanac' })).toBeInTheDocument();
    expect(save.value.seenAlmanac).toBe('2026-10-16');
    first.unmount();
    panel.value = null;
    render(<App />);
    expect(screen.queryByRole('dialog', { name: 'Almanac' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/ui/hud.test.tsx tests/ui/almanac.test.tsx tests/app/app.test.tsx`
Expected: FAIL with `Failed to resolve import "../../src/ui/Hud"` and `.../Almanac`. The app test fails because no almanac dialog opens.

- [ ] **Step 3: Write `src/ui/Hud.tsx` and `src/ui/hud.css`**

`src/ui/Hud.tsx`:
```tsx
import { openPanel, save, today } from '../app/store';
import { daysToExam, formatDay } from '../core/dates';
import { dueCrops } from '../core/srs';
import { waterAll } from './actions';
import { CoinIcon, DropIcon } from './icons';
import './hud.css';

function countdownLabel(d: number): string {
  if (d > 0) return `D-${d} · Festival`;
  return d === 0 ? 'Festival day!' : 'Festival done';
}

export function Hud() {
  const s = save.value;
  const t = today.value;
  const due = dueCrops(s, t).length;
  return (
    <header class="hud">
      <button type="button" class="hud-date" onClick={() => openPanel({ kind: 'almanac' })} aria-label={`Open almanac: ${formatDay(t)}`}>
        <span class="hud-day">{formatDay(t)}</span>
        <span class="hud-count">{countdownLabel(daysToExam(t))}</span>
      </button>
      <span class="hud-spacer" />
      <button type="button" class="hud-chip water" onClick={waterAll} disabled={!due} aria-label={`Water ${due} thirsty crops`}>
        <DropIcon /> {due}
      </button>
      <span class="hud-chip gold" aria-label={`${s.gold} gold`}>
        <CoinIcon /> {s.gold}
      </span>
    </header>
  );
}
```

`src/ui/hud.css`:
```css
.hud {
  position: absolute; top: 0; left: 0; right: 0; z-index: 5;
  height: calc(var(--hud-h) + var(--safe-top)); padding: var(--safe-top) 10px 0;
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(rgba(255, 250, 240, 0.97), rgba(255, 250, 240, 0.9));
  border-bottom: 2px solid var(--line);
}
.hud-date {
  display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
  min-height: 44px; padding: 2px 6px; border: 0; background: none; cursor: pointer; line-height: 1.15;
}
.hud-day { font-weight: 900; font-size: 15px; }
.hud-count { font-size: 12px; font-weight: 800; color: var(--red-d); }
.hud-spacer { flex: 1; }
.hud-chip {
  display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 4px 10px;
  border-radius: 12px; border: 2px solid var(--line); background: #fff; font-weight: 900; font-size: 15px;
}
button.hud-chip { cursor: pointer; }
button.hud-chip:disabled { opacity: 0.5; cursor: default; }
.hud-chip.water { color: var(--blue-d); }
.hud-chip.gold { color: #8a5c08; }
```

- [ ] **Step 4: Write `src/ui/Almanac.tsx` and `src/ui/almanac.css`**

`src/ui/Almanac.tsx`:
```tsx
import { closePanel, openPanel, save, today } from '../app/store';
import { daysToExam, formatDay } from '../core/dates';
import { dueCrops, readyCrops } from '../core/srs';
import { PLAN, planFor, type Suggestion } from '../data/plan';
import { waterAll } from './actions';
import { Button, Chip, Panel } from './kit';
import './almanac.css';

function run(sg: Suggestion) {
  if (sg.kind === 'water') waterAll();
  else if (sg.kind === 'practice') openPanel({ kind: 'practice', subject: sg.subject, area: sg.area });
  else openPanel({ kind: 'house' });
}

function countdown(d: number): string {
  if (d > 1) return `${d} days to the Harvest Festival`;
  if (d === 1) return 'The Harvest Festival is tomorrow!';
  if (d === 0) return 'Harvest Festival — today! You trained for this.';
  return 'The festival has passed. Well farmed!';
}

export function AlmanacPanel() {
  const s = save.value;
  const t = today.value;
  const plan = planFor(t);
  const thirsty = dueCrops(s, t).length;
  const ready = readyCrops(s).length;
  return (
    <Panel title="Almanac" onClose={closePanel}>
      <div class={`almanac-hero mood-${plan.mood}`}>
        <div class="almanac-date">{formatDay(t)}</div>
        <div class="almanac-count">{countdown(daysToExam(t))}</div>
      </div>
      <div class="cal-strip" role="list" aria-label="Days to the festival">
        {PLAN.map((p) => (
          <div
            role="listitem"
            key={p.date}
            class={`cal-day mood-${p.mood}${p.date === t ? ' today' : p.date < t ? ' past' : ''}`}
            title={`${formatDay(p.date)} · ${p.title}`}
          >
            <span class="wd">{formatDay(p.date).slice(0, 3)}</span>
            <span class="dn">{Number(p.date.slice(8))}</span>
          </div>
        ))}
      </div>
      <div class="card">
        <h3>{plan.title}</h3>
        <p class="muted">{plan.focus}</p>
        <ol class="tasks">
          {plan.tasks.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
        {plan.suggest.length > 0 && (
          <div class="row">
            {plan.suggest.map((sg) => (
              <Button key={sg.label} onClick={() => run(sg)}>
                {sg.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div class="card">
        <h3>Your farm this morning</h3>
        <div class="row">
          <Chip tone="blue">{thirsty} thirsty</Chip>
          <Chip tone="gold">{ready} ready to harvest</Chip>
          <Chip>{Object.keys(s.crops).length} crops growing</Chip>
          <Chip tone="gold">{s.gold} gold</Chip>
        </div>
        <p class="muted">Thirsty crops are earlier misses coming back. Water them before you fish for new questions.</p>
      </div>
    </Panel>
  );
}
```

`src/ui/almanac.css`:
```css
.almanac-hero { border-radius: var(--radius); padding: 18px 16px; margin-bottom: 12px; color: #fff; background: linear-gradient(135deg, #4cb36b, #2f8a52); box-shadow: var(--shadow); }
.almanac-hero.mood-mock { background: linear-gradient(135deg, #3d9be9, #2a6fbd); }
.almanac-hero.mood-rest { background: linear-gradient(135deg, #8c7ae6, #5b4bc4); }
.almanac-hero.mood-exam { background: linear-gradient(135deg, #f4b63d, #e07a2e); color: #2b1a00; }
.almanac-date { font-size: 26px; font-weight: 900; }
.almanac-count { font-weight: 800; opacity: 0.95; }
.cal-strip { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 10px; margin-bottom: 4px; }
.cal-day { flex: 0 0 auto; width: 46px; padding: 6px 0; border-radius: 12px; text-align: center; background: var(--paper); border: 2px solid var(--line); }
.cal-day .wd { display: block; font-size: 11px; font-weight: 800; color: var(--mute); }
.cal-day .dn { display: block; font-size: 18px; font-weight: 900; }
.cal-day.past { opacity: 0.45; }
.cal-day.today { border-color: var(--green); background: #e7f6ec; }
.cal-day.mood-exam { border-color: var(--gold); background: #fff3d1; }
.tasks { margin: 8px 0 12px; padding-left: 20px; }
.tasks li { margin: 4px 0; }
```

- [ ] **Step 5: Register the almanac panel and rewrite `src/app/App.tsx`**

In `src/app/panels.tsx` add the import:
```tsx
import { AlmanacPanel } from '../ui/Almanac';
```
and add this case immediately above `default:`:
```tsx
    case 'almanac':
      return <AlmanacPanel />;
```

Replace `src/app/App.tsx` entirely:
```tsx
import { useEffect } from 'preact/hooks';
import { Farm } from '../scene/Farm';
import { Hud } from '../ui/Hud';
import { ToastHost } from '../ui/kit';
import { PanelHost } from './panels';
import { openPanel, panel, save, saveFailed, startClock, today, update } from './store';
import '../styles/base.css';

export function App() {
  useEffect(() => startClock(), []);
  const t = today.value;
  useEffect(() => {
    if (save.value.seenAlmanac === t) return;
    update((s) => {
      s.seenAlmanac = t;
    });
    if (!panel.value) openPanel({ kind: 'almanac' });
  }, [t]);

  const p = panel.value;
  const calm = save.value.settings.batterySaver;
  return (
    <div class={`app${p ? ' has-panel' : ''}${calm ? ' calm' : ''}`}>
      <main class="stage">
        <Farm paused={!!p} />
        <Hud />
      </main>
      {p && <PanelHost panel={p} />}
      {saveFailed.value && (
        <div class="save-warn" role="alert">
          Couldn't save on this device. Export a backup in the House.
        </div>
      )}
      <ToastHost />
    </div>
  );
}
```

- [ ] **Step 6: Run all tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: all files pass (hud 3, almanac 2, app 1, plus earlier); tsc exit 0.

- [ ] **Step 7: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: HUD with countdown/thirsty/gold and a daily almanac that opens each morning

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Answering past-paper questions (commit → reveal → pest)

**Files:**
- Create: `src/ui/paper/PaperQuestion.tsx`, `src/ui/paper/PestPicker.tsx`, `src/ui/paper/ImageZoom.tsx`, `src/ui/paper/Session.tsx`, `src/ui/paper/paper.css`, `tests/ui/paper.test.tsx`
- Modify: `src/app/panels.tsx` (add the `session` case)

**Interfaces:**
- Consumes: `today`, `update`, `closePanel` (Task 8); `sfx`, `buzz` (Task 8); `recordPaperAnswer`, `tagMiss`, `setCue`, `PaperAnswerResult` (Task 6); `CropEvent` (Task 5); `PESTS` (Task 5); `fmtClock`, `formatDay` (Task 3); bank helpers (Task 2); `CROP_NAMES`, `fieldInfo`, `topicInfo` (Task 2); `Button`, `Panel`, `CloseIcon` (Task 8).
- Produces:
  - `PaperQuestion({qid, index, total, mode, onNext})`, where `onNext(result: SessionResult | null)` (null = skipped); `SessionResult {qid, ok, conf, event, gold}`.
  - `Session({ids, mode, title})`, a dialog that runs the questions and ends on `SessionSummary({results, total})`.
  - `PestPicker({value, suggest, onPick})`, `ImageZoom({src, alt, onClose})`.
  - Accessible names: option buttons are named by their letter (`a`…`j`) inside `group "Answer options"`; confidence buttons are `1 · Sure`, `2 · Unsure`, `3 · Guess`; action buttons are `Commit answer`, `Skip`, `Next →`, `Finish`; pest buttons are `K · Blight Concept gap`, and so on.

- [ ] **Step 1: Write the failing tests**

`tests/ui/paper.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { now, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { byId } from '../../src/data/bank';
import { PaperQuestion } from '../../src/ui/paper/PaperQuestion';
import { Session } from '../../src/ui/paper/Session';

const noop = () => {};

beforeEach(() => {
  save.value = defaultSave();
  now.value = new Date(2026, 9, 16, 9, 0).getTime();
});

describe('past-paper question', () => {
  it('never reveals the answer or explanation before commit', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    expect(screen.queryByText(byId['2025S_A_Q01'].why)).toBeNull();
    expect(screen.queryByText(/answer a\)/)).toBeNull();
    const commit = screen.getByRole('button', { name: 'Commit answer' });
    expect(commit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'a' }));
    expect(commit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '1 · Sure' }));
    expect(commit).toBeEnabled();
    fireEvent.click(commit);
    expect(screen.getByText(byId['2025S_A_Q01'].why)).toBeInTheDocument();
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
  });

  it('turns a sure-but-wrong answer into a golden crop with a pest diagnosis', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'c' }));
    fireEvent.click(screen.getByRole('button', { name: '1 · Sure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit answer' }));
    expect(screen.getByText(/Sure but wrong/)).toBeInTheDocument();
    expect(screen.getByText(/Planted a carrot in the Tech Orchard/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /K · Blight/ }));
    expect(save.value.crops['paper:2025S_A_Q01']).toMatchObject({ sbw: true, pest: 'K' });
    expect(save.value.att['2025S_A_Q01'][0].tag).toBe('K');
  });

  it('offers all ten options on the widest question', () => {
    render(<PaperQuestion qid="2025A_B_Q10" index={0} total={1} mode="practice" onNext={noop} />);
    expect(screen.getByRole('group', { name: 'Answer options' }).querySelectorAll('button.opt')).toHaveLength(10);
  });

  it('shows a friendly message when the image is not cached offline', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent("isn't on this device yet");
  });

  it('supports keyboard answering on a PC', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
  });
});

describe('session', () => {
  it('runs questions to a summary with farm events', () => {
    render(<Session ids={['2025S_A_Q01', '2025S_A_Q02']} mode="practice" title="Fishing" />);
    fireEvent.click(screen.getByRole('button', { name: 'c' }));
    fireEvent.click(screen.getByRole('button', { name: '2 · Unsure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('0/1')).toBeInTheDocument();
    expect(screen.getByText(/1 skipped/)).toBeInTheDocument();
    expect(screen.getByText(/1 seed planted/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/ui/paper.test.tsx`
Expected: FAIL with `Failed to resolve import "../../src/ui/paper/PaperQuestion"`.

- [ ] **Step 3: Write `src/ui/paper/PestPicker.tsx` and `src/ui/paper/ImageZoom.tsx`**

`src/ui/paper/PestPicker.tsx`:
```tsx
import { PESTS } from '../../core/economy';
import type { ErrorTag } from '../../data/types';

const ORDER: ErrorTag[] = ['K', 'C', 'N', 'M', 'T'];

interface Props {
  value: ErrorTag | null;
  suggest: ErrorTag | null;
  onPick: (t: ErrorTag) => void;
}

export function PestPicker({ value, suggest, onPick }: Props) {
  return (
    <div class="pest-picker">
      <b>Which pest got this one?</b>
      {suggest && <span class="muted"> Over pace, so maybe Frost?</span>}
      <div class="pests">
        {ORDER.map((t) => (
          <button
            type="button"
            key={t}
            class={`pest${value === t ? ' on' : ''}${suggest === t && value !== t ? ' suggest' : ''}`}
            aria-pressed={value === t}
            onClick={() => onPick(t)}
          >
            <b>
              {t} · {PESTS[t].name}
            </b>
            <small>{PESTS[t].label}</small>
          </button>
        ))}
      </div>
      {value && <p class="muted">Remedy: {PESTS[value].remedy}</p>}
    </div>
  );
}
```

`src/ui/paper/ImageZoom.tsx`:
```tsx
import { useEffect } from 'preact/hooks';
import { CloseIcon } from '../icons';

export function ImageZoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true); // capture: close the zoom, not the panel
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div class="zoom" role="dialog" aria-label="Zoomed question">
      <button type="button" class="icon-btn" onClick={onClose} aria-label="Close zoom">
        <CloseIcon />
      </button>
      <img src={src} alt={alt} />
    </div>
  );
}
```

- [ ] **Step 4: Write `src/ui/paper/PaperQuestion.tsx`**

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { buzz, sfx } from '../../app/feedback';
import { today, update } from '../../app/store';
import { fmtClock, formatDay } from '../../core/dates';
import { recordPaperAnswer, setCue, tagMiss, type PaperAnswerResult } from '../../core/record';
import type { CropEvent } from '../../core/srs';
import type { AttemptMode } from '../../core/state';
import { LETTERS, PACE_SECONDS, byId, imageUrl, optionCount, sourceLabel, subjectOf } from '../../data/bank';
import { CROP_NAMES, fieldInfo, topicInfo } from '../../data/topics';
import type { Confidence, ErrorTag } from '../../data/types';
import { Button } from '../kit';
import { ImageZoom } from './ImageZoom';
import { PestPicker } from './PestPicker';
import './paper.css';

export interface SessionResult {
  qid: string;
  ok: boolean;
  conf: Confidence;
  event: CropEvent;
  gold: number;
}

const CONFS: [Confidence, string][] = [
  ['S', 'Sure'],
  ['U', 'Unsure'],
  ['G', 'Guess'],
];

type Committed = PaperAnswerResult & { secs: number; conf: Confidence };

interface Props {
  qid: string;
  index: number;
  total: number;
  mode: AttemptMode;
  onNext: (r: SessionResult | null) => void;
}

function EventLine({ event, topic, gold, due }: { event: CropEvent; topic: string; gold: number; due?: string }) {
  const info = topicInfo(topic);
  const crop = CROP_NAMES[info.crop];
  const field = fieldInfo(info.field).name;
  const text =
    event === 'planted'
      ? `🌱 Planted a ${crop} in the ${field}. Water it tomorrow.`
      : event === 'grew'
        ? `💧 Watered! Your ${crop} grew.${due ? ` Next watering: ${formatDay(due)}.` : ''}`
        : event === 'ready'
          ? `✨ Your ${crop} is ready to harvest! Tap it on the farm.`
          : event === 'wilted'
            ? `🥀 Your ${crop} wilted a little. Water it again tomorrow.`
            : event === 'same-day'
              ? 'Already watered today. Come back tomorrow so it grows.'
              : gold > 0
                ? `⭐ +${gold} gold`
                : '';
  return text ? <p class="event">{text}</p> : null;
}

export function PaperQuestion({ qid, index, total, mode, onNext }: Props) {
  const q = byId[qid];
  const letters = LETTERS.slice(0, optionCount(q)) as string[];
  const pace = PACE_SECONDS[subjectOf(qid)];
  const [pick, setPick] = useState<string | null>(null);
  const [conf, setConf] = useState<Confidence | null>(null);
  const [done, setDone] = useState<Committed | null>(null);
  const [tag, setTag] = useState<ErrorTag | null>(null);
  const [zoom, setZoom] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [secs, setSecs] = useState(0);
  const t0 = useRef(Date.now());

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setSecs(Math.round((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [done]);

  const commit = () => {
    if (done) {
      onNext({ qid, ok: done.ok, conf: done.conf, event: done.event, gold: done.gold });
      return;
    }
    if (!pick || !conf) return;
    const spent = Math.round((Date.now() - t0.current) / 1000);
    const r = update((s) => recordPaperAnswer(s, { qid, pick, conf, secs: spent, mode, today: today.value, ts: Date.now() }));
    setDone({ ...r, secs: spent, conf });
    sfx(r.ok ? 'right' : 'wrong');
    buzz(r.ok ? 12 : 45);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const k = e.key.toLowerCase();
      if (!done && k.length === 1 && letters.includes(k)) setPick(k);
      else if (!done && (k === '1' || k === '2' || k === '3')) setConf(CONFS[Number(k) - 1][0]);
      else if (k === 'enter') {
        e.preventDefault();
        commit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shownSecs = done ? done.secs : secs;
  const slow = shownSecs > pace;
  const headline = !done
    ? ''
    : done.ok
      ? done.conf === 'G'
        ? 'Right, but a guess — planted for review'
        : 'Correct!'
      : done.conf === 'S'
        ? 'Sure but wrong — a golden crop to fix first'
        : 'Not quite';

  return (
    <div class="paper-q">
      <div class="q-meta">
        <span>
          {index + 1}/{total} · <span class={`q-clock${slow ? ' over' : ''}`}>{fmtClock(shownSecs)}</span> / {fmtClock(pace)}
        </span>
        <span class="q-src">{sourceLabel(qid)}</span>
      </div>
      <div class="q-topic">
        {q.topic} · {q.sub}
      </div>
      <div class="q-image">
        {imgFailed ? (
          <div class="img-missing" role="alert">
            This question image isn't on this device yet. Go online once, or use House → Download all questions.
          </div>
        ) : (
          <img src={imageUrl(qid)} alt={`Question ${sourceLabel(qid)}`} decoding="async" onClick={() => setZoom(true)} onError={() => setImgFailed(true)} />
        )}
        {!imgFailed && <div class="q-hint">Tap the question to zoom</div>}
      </div>
      <div class="opts" role="group" aria-label="Answer options">
        {letters.map((c) => (
          <button
            type="button"
            key={c}
            class={`opt${pick === c ? ' sel' : ''}${done && c === q.key ? ' right' : ''}${done && c === pick && c !== q.key ? ' wrong' : ''}`}
            aria-pressed={pick === c}
            disabled={!!done}
            onClick={() => {
              setPick(c);
              sfx('tap');
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div class="confs" role="group" aria-label="Confidence">
        {CONFS.map(([k, label], i) => (
          <button type="button" key={k} class={`conf${conf === k ? ' on' : ''}`} aria-pressed={conf === k} disabled={!!done} onClick={() => setConf(k)}>
            {i + 1} · {label}
          </button>
        ))}
      </div>
      <div class="q-actions">
        {!done && (
          <Button variant="ghost" onClick={() => onNext(null)}>
            Skip
          </Button>
        )}
        <Button onClick={commit} disabled={!done && !(pick && conf)}>
          {done ? (index + 1 < total ? 'Next →' : 'Finish') : 'Commit answer'}
        </Button>
      </div>
      {done && (
        <div class={`feedback ${done.ok ? 'ok' : 'no'}`} aria-live="polite">
          <div class="head">
            {headline} · answer {q.key})
          </div>
          <EventLine event={done.event} topic={q.topic} gold={done.gold} due={done.crop?.due} />
          <p>{q.why}</p>
          {q.trap && (
            <p class="trap">
              <b>Trap:</b> {q.trap}
            </p>
          )}
          {q.cue && (
            <p class="cue">
              <b>Cue:</b> {q.cue}
            </p>
          )}
          {q.note && (
            <p class="keynote">
              <b>Key note:</b> {q.note}
            </p>
          )}
          {!done.ok && (
            <>
              <PestPicker
                value={tag}
                suggest={slow ? 'T' : null}
                onPick={(t) => {
                  setTag(t);
                  update((s) => tagMiss(s, qid, t));
                }}
              />
              <input
                type="text"
                class="cue-in"
                placeholder="My cue that would have caught it (optional)"
                aria-label="My cue"
                onChange={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  update((s) => setCue(s, qid, v));
                }}
              />
            </>
          )}
        </div>
      )}
      {zoom && <ImageZoom src={imageUrl(qid)} alt={sourceLabel(qid)} onClose={() => setZoom(false)} />}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/ui/paper/Session.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { closePanel } from '../../app/store';
import type { CropEvent } from '../../core/srs';
import type { AttemptMode } from '../../core/state';
import { sourceLabel } from '../../data/bank';
import { Button, Panel } from '../kit';
import { PaperQuestion, type SessionResult } from './PaperQuestion';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function SessionSummary({ results, total }: { results: SessionResult[]; total: number }) {
  const right = results.filter((r) => r.ok).length;
  const half = Math.ceil(results.length / 2);
  const pct = (a: SessionResult[]) => (a.length ? Math.round((100 * a.filter((r) => r.ok).length) / a.length) : 0);
  const first = pct(results.slice(0, half));
  const second = pct(results.slice(half));
  const sbw = results.filter((r) => !r.ok && r.conf === 'S');
  const lucky = results.filter((r) => r.ok && r.conf === 'G');
  const count = (e: CropEvent) => results.filter((r) => r.event === e).length;
  const gold = results.reduce((g, r) => g + r.gold, 0);
  const drop = results.length >= 6 && second <= first - 20;
  const skipped = total - results.length;
  const lines = [
    count('planted') ? `🌱 ${plural(count('planted'), 'seed')} planted from misses — water tomorrow` : '',
    count('grew') ? `💧 ${plural(count('grew'), 'crop')} grew` : '',
    count('ready') ? `✨ ${plural(count('ready'), 'crop')} ready to harvest` : '',
    count('wilted') ? `🥀 ${plural(count('wilted'), 'crop')} wilted — thirsty again tomorrow` : '',
  ].filter(Boolean);
  return (
    <div class="summary">
      <div class="card center">
        <div class="summary-big">
          {right}/{results.length}
        </div>
        <div class="muted">
          {skipped > 0 ? `${skipped} skipped · ` : ''}+{gold} gold
        </div>
        {results.length >= 4 && (
          <p class="muted">
            First half {first}% · second half {second}%{drop ? ' · late drop: take a break before the next set' : ''}
          </p>
        )}
      </div>
      <div class="card">
        <h3>On the farm</h3>
        <ul class="events">{lines.length ? lines.map((l) => <li key={l}>{l}</li>) : <li>All clean — nothing new to tend.</li>}</ul>
      </div>
      {sbw.length > 0 && (
        <div class="card warn">
          <h3>Sure but wrong ({sbw.length})</h3>
          <p class="muted">{sbw.map((r) => sourceLabel(r.qid)).join(', ')}. These are golden crops: fix them first.</p>
        </div>
      )}
      {lucky.length > 0 && <p class="muted">Lucky guesses ({lucky.length}) count as not learned, so they were planted too.</p>}
      <Button block onClick={closePanel}>
        Back to the farm
      </Button>
    </div>
  );
}

export function Session({ ids, mode, title }: { ids: string[]; mode: AttemptMode; title: string }) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const body = !ids.length ? (
    <div class="card">
      <p>No questions here right now.</p>
    </div>
  ) : i >= ids.length ? (
    <SessionSummary results={results} total={ids.length} />
  ) : (
    <PaperQuestion
      key={ids[i]}
      qid={ids[i]}
      index={i}
      total={ids.length}
      mode={mode}
      onNext={(r) => {
        if (r) setResults((rs) => [...rs, r]);
        setI((x) => x + 1);
      }}
    />
  );
  return (
    <Panel title={title} onClose={closePanel}>
      {body}
    </Panel>
  );
}
```

- [ ] **Step 6: Write `src/ui/paper/paper.css`**

```css
.q-meta { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 13px; font-weight: 700; color: var(--mute); }
.q-src { font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
.q-clock { font-variant-numeric: tabular-nums; }
.q-clock.over { color: var(--red-d); font-weight: 900; }
.q-topic { margin-top: 2px; font-size: 14px; font-weight: 800; }
.q-image { margin: 10px 0; background: #fff; border: 2px solid var(--line); border-radius: 14px; overflow: hidden; }
.q-image img { display: block; width: 100%; height: auto; cursor: zoom-in; }
.q-hint { padding: 4px 10px 8px; font-size: 12px; color: var(--mute); }
.img-missing { padding: 18px; text-align: center; color: var(--mute); font-weight: 700; }
.opts { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 12px 0 6px; }
.opt { width: 52px; height: 52px; border-radius: 14px; border: 3px solid var(--line); background: #fff; font-size: 20px; font-weight: 900; cursor: pointer; box-shadow: 0 3px 0 var(--line); }
.opt.sel { border-color: var(--blue); background: #e6f3fd; box-shadow: 0 3px 0 var(--blue-d); }
.opt.right { border-color: var(--green); background: #dcf1e2; }
.opt.wrong { border-color: var(--red); background: #fde1da; }
.confs { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 6px 0 12px; }
.conf { min-height: 44px; padding: 6px 14px; border-radius: 99px; border: 2px solid var(--line); background: #fff; font-weight: 800; cursor: pointer; }
.conf.on { background: var(--ink); border-color: var(--ink); color: #fff; }
.q-actions { display: flex; justify-content: center; gap: 10px; }
.feedback { margin-top: 14px; padding: 14px; border-radius: 16px; border: 2px solid; }
.feedback.ok { background: #eef8f1; border-color: #bfe3cb; }
.feedback.no { background: #fdf1ee; border-color: #f0c9bf; }
.feedback .head { font-size: 17px; font-weight: 900; }
.feedback .event { margin: 6px 0; font-weight: 800; }
.feedback .trap, .feedback .cue, .feedback .keynote { font-size: 14px; }
.feedback .keynote { color: #8a5a00; }
.pest-picker { margin-top: 10px; }
.pests { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
.pest { min-height: 44px; padding: 8px 10px; text-align: left; border-radius: 12px; border: 2px solid var(--line); background: #fff; cursor: pointer; }
.pest b { display: block; }
.pest small { color: var(--mute); }
.pest.on { background: var(--ink); border-color: var(--ink); color: #fff; }
.pest.on small { color: #ddd; }
.pest.suggest { border-color: var(--gold); }
.cue-in { width: 100%; margin-top: 8px; }
.zoom { position: fixed; inset: 0; z-index: 70; overflow: auto; background: rgba(15, 15, 12, 0.92); touch-action: pan-x pan-y pinch-zoom; }
.zoom img { display: block; width: max(820px, 100%); max-width: none; margin: 60px auto 24px; background: #fff; }
.zoom .icon-btn { position: fixed; top: calc(10px + var(--safe-top)); right: 10px; z-index: 1; }
.summary-big { font-size: 40px; font-weight: 900; }
.events { margin: 0; padding-left: 20px; }
.events li { margin: 4px 0; }
```

- [ ] **Step 7: Register the session panel**

In `src/app/panels.tsx` add the import:
```tsx
import { Session } from '../ui/paper/Session';
```
and add this case immediately above `default:`:
```tsx
    case 'session':
      return <Session key={`${p.title}:${p.ids.join(',')}`} ids={p.ids} mode={p.mode} title={p.title} />;
```

- [ ] **Step 8: Run all tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: all files pass (paper 6, plus earlier); tsc exit 0.

- [ ] **Step 9: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: past-paper runner with commit-before-reveal, confidence, pests, zoom and summary

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Pond, mine and field panels

**Files:**
- Create: `src/ui/activities/PracticePanel.tsx`, `src/ui/activities/FieldPanel.tsx`, `src/ui/activities/activities.css`, `tests/ui/activities.test.tsx`
- Modify: `src/ui/actions.ts` (add `waterField`), `src/app/panels.tsx` (add the `practice` and `field` cases)

**Interfaces:**
- Consumes: store (Task 8); `buildPool`, `isHeld`, `pickSet`, `PracticeOrder` (Task 6); `topicMastery`, `Mastery` (Task 7); `cropsInField`, `isThirsty`, `dueCrops` (Task 5); `BANK`, `HOLD_PAPER`, `PAPERS`, `subjectOf` (Task 2); `CROP_NAMES`, `TOPICS`, `fieldInfo`, `topicsInField`, `topicInfo` (Task 2); `cropHref` (Task 9); kit (Task 8).
- Produces:
  - `PracticePanel({subject, area?})`, a dialog titled "Pond · Subject A" or "Mine · Subject B" with selects labeled `Paper`, `Area`, `Size`, `Order` and a `Cast the line` / `Start mining` button. It opens a session titled `Fishing` or `Mining`.
  - `FieldPanel({field})`, a dialog titled with the field name, showing a per-topic list with mastery chips, a `Water this field (N)` button, and practice buttons.
  - `waterField(field: FieldId): void`.

- [ ] **Step 1: Write the failing tests**

`tests/ui/activities.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import type { PanelState } from '../../src/app/panel-types';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { FieldPanel } from '../../src/ui/activities/FieldPanel';
import { PracticePanel } from '../../src/ui/activities/PracticePanel';
import { makeCrop } from '../helpers';

type SessionPanel = Extract<PanelState, { kind: 'session' }>;

beforeEach(() => {
  save.value = defaultSave();
  panel.value = null;
  now.value = new Date(2026, 9, 16, 9, 0).getTime();
});

describe('pond and mine', () => {
  it('casts a smart set from the pond and honours the 2026S hold', () => {
    render(<PracticePanel subject="A" />);
    expect(screen.getByText('120 questions · 0 seen · 120 new · 60 held back for the 2026S mock')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Area'), { target: { value: 'strategy' } });
    expect(screen.getByText(/^43 questions/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cast the line' }));
    const p = panel.value as SessionPanel;
    expect(p.kind).toBe('session');
    expect(p.title).toBe('Fishing');
    expect(p.ids).toHaveLength(10);
    expect(p.ids.every((id) => !id.startsWith('2026S'))).toBe(true);
  });

  it('mines Subject B programming in paper order', () => {
    render(<PracticePanel subject="B" area="code" />);
    fireEvent.change(screen.getByLabelText('Paper'), { target: { value: '2025S' } });
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'paper' } });
    fireEvent.change(screen.getByLabelText('Size'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start mining' }));
    const p = panel.value as SessionPanel;
    expect(p.title).toBe('Mining');
    expect(p.ids).toEqual(['2025S_B_Q01', '2025S_B_Q02', '2025S_B_Q03', '2025S_B_Q04', '2025S_B_Q05']);
  });
});

describe('field panel', () => {
  it('lists the field topics and waters only that field', () => {
    save.value = {
      ...defaultSave(),
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-16' }),
        'paper:2025S_A_Q03': makeCrop({ ref: '2025S_A_Q03', topic: 'System strategy', due: '2026-10-16' }),
      },
    };
    render(<FieldPanel field="tech" />);
    expect(screen.getByText('Number & logic')).toBeInTheDocument();
    expect(screen.queryByText('System strategy')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Water this field (1)' }));
    expect(panel.value).toEqual({ kind: 'session', ids: ['2025S_A_Q01'], mode: 'review', title: 'Watering' });
  });

  it('offers both subjects for the security hedge', () => {
    render(<FieldPanel field="security" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mine (Subject B)' }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'B', area: 'security' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/ui/activities.test.tsx`
Expected: FAIL with `Failed to resolve import "../../src/ui/activities/FieldPanel"`.

- [ ] **Step 3: Add `waterField` to `src/ui/actions.ts`**

Add these imports at the top of `src/ui/actions.ts`:
```ts
import { topicInfo } from '../data/topics';
import type { FieldId } from '../data/types';
```
Append this function:
```ts
export function waterField(field: FieldId): void {
  const ids = dueCrops(save.value, today.value)
    .filter((c) => c.kind === 'paper' && topicInfo(c.topic).field === field)
    .map((c) => c.ref);
  if (!ids.length) {
    showToast('Nothing thirsty in this field.');
    return;
  }
  openPanel({ kind: 'session', ids, mode: 'review', title: 'Watering' });
}
```

- [ ] **Step 4: Write `src/ui/activities/PracticePanel.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { closePanel, openPanel, save, showToast } from '../../app/store';
import { buildPool, isHeld, pickSet, type PracticeOrder } from '../../core/practice';
import { BANK, HOLD_PAPER, PAPERS, subjectOf } from '../../data/bank';
import type { PaperId, Subject } from '../../data/types';
import { Button, Panel } from '../kit';
import './activities.css';

const topicsOf = (subject: Subject) => [...new Set(BANK.filter((q) => subjectOf(q.id) === subject).map((q) => q.topic))].sort();

const AREAS: Record<Subject, [string, string][]> = {
  A: [
    ['*', 'All topics'],
    ['strategy', '★ Market Garden — strategy & management'],
    ['tech', 'Tech Orchard — hardware, OS, network, logic'],
    ['devdb', 'Greenhouse — development & database'],
    ['security', 'Thorn Hedge — security'],
    ...topicsOf('A').map((t): [string, string] => [t, t]),
  ],
  B: [
    ['*', 'All Subject B'],
    ['code', 'Code Garden — programming (16 of 20)'],
    ['security', 'Thorn Hedge — security scenarios (4 of 20)'],
    ...topicsOf('B')
      .filter((t) => t !== 'Security')
      .map((t): [string, string] => [t, t]),
  ],
};

const PAPER_IDS = Object.keys(PAPERS) as PaperId[];
const valueOf = (e: Event) => (e.target as HTMLSelectElement).value;

export function PracticePanel({ subject, area: initialArea }: { subject: Subject; area?: string }) {
  const s = save.value;
  const isA = subject === 'A';
  const [paper, setPaper] = useState<PaperId | '*'>('*');
  const [area, setArea] = useState(initialArea ?? '*');
  const [size, setSize] = useState(10);
  const [order, setOrder] = useState<PracticeOrder>('smart');
  const filter = { subject, paper, topic: area };
  const pool = buildPool(s, filter);
  const seen = pool.filter((q) => s.att[q.id]?.length).length;
  const held = BANK.filter((q) => subjectOf(q.id) === subject && isHeld(s, q)).length;

  const start = () => {
    const ids = pickSet(s, filter, size, order, Math.random);
    if (!ids.length) {
      showToast('No questions match. Try another filter.');
      return;
    }
    openPanel({ kind: 'session', ids, mode: 'practice', title: isA ? 'Fishing' : 'Mining' });
  };

  return (
    <Panel title={isA ? 'Pond · Subject A' : 'Mine · Subject B'} onClose={closePanel}>
      <div class={`practice-hero ${isA ? 'pond' : 'mine'}`}>
        <b>{isA ? 'Cast for real past-paper questions' : 'Dig into real Subject B questions'}</b>
        <span>
          {isA
            ? 'About 90 seconds each. Every miss becomes a seed on your farm.'
            : 'About 5 minutes each; bail out of a trace after ~7. Misses grow in the Code Garden.'}
        </span>
      </div>
      <div class="card">
        <label class="field-row">
          Paper
          <select value={paper} onChange={(e) => setPaper(valueOf(e) as PaperId | '*')}>
            <option value="*">All papers</option>
            {PAPER_IDS.map((p) => (
              <option key={p} value={p}>
                {p} · {PAPERS[p]}
                {p === HOLD_PAPER && held ? ' (held for the mock)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label class="field-row">
          Area
          <select value={area} onChange={(e) => setArea(valueOf(e))}>
            {AREAS[subject].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label class="field-row">
          Size
          <select value={String(size)} onChange={(e) => setSize(Number(valueOf(e)))}>
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={String(n)}>
                {n} questions
              </option>
            ))}
            <option value="999">All</option>
          </select>
        </label>
        <label class="field-row">
          Order
          <select value={order} onChange={(e) => setOrder(valueOf(e) as PracticeOrder)}>
            <option value="smart">Smart: misses + unseen first</option>
            <option value="shuffle">Shuffle</option>
            <option value="paper">Paper order</option>
          </select>
        </label>
        <p class="muted">
          {pool.length} questions · {seen} seen · {pool.length - seen} new{held ? ` · ${held} held back for the ${HOLD_PAPER} mock` : ''}
        </p>
        <Button block onClick={start} disabled={!pool.length}>
          {isA ? 'Cast the line' : 'Start mining'}
        </Button>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 5: Write `src/ui/activities/FieldPanel.tsx`**

```tsx
import { closePanel, openPanel, save, today } from '../../app/store';
import { topicMastery, type Mastery } from '../../core/report';
import { cropsInField, isThirsty } from '../../core/srs';
import { CROP_NAMES, TOPICS, fieldInfo, topicsInField } from '../../data/topics';
import type { FieldId } from '../../data/types';
import { cropHref } from '../../scene/art';
import { waterField } from '../actions';
import { Button, Chip, Panel } from '../kit';
import './activities.css';

const STATUS: Record<Mastery, { label: string; tone?: 'red' | 'yel' | 'grn' }> = {
  new: { label: 'NEW' },
  red: { label: 'RED', tone: 'red' },
  yel: { label: 'YELLOW', tone: 'yel' },
  grn: { label: 'GREEN', tone: 'grn' },
};

function PracticeButtons({ field }: { field: FieldId }) {
  if (field === 'code')
    return (
      <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'B', area: 'code' })}>
        Mine this field
      </Button>
    );
  if (field === 'security')
    return (
      <>
        <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'A', area: 'security' })}>
          Fish (Subject A)
        </Button>
        <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'B', area: 'security' })}>
          Mine (Subject B)
        </Button>
      </>
    );
  return (
    <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'A', area: field })}>
      Fish this field
    </Button>
  );
}

export function FieldPanel({ field }: { field: FieldId }) {
  const s = save.value;
  const t = today.value;
  const info = fieldInfo(field);
  const crops = cropsInField(s, field, t);
  const thirsty = crops.filter((c) => isThirsty(c, t)).length;
  return (
    <Panel title={info.name} onClose={closePanel}>
      <p class="muted">{info.blurb}</p>
      <div class="row field-actions">
        <Button onClick={() => waterField(field)} disabled={!thirsty}>
          Water this field ({thirsty})
        </Button>
        <PracticeButtons field={field} />
      </div>
      <ul class="topic-list">
        {topicsInField(field).map((topic) => {
          const m = topicMastery(s, topic);
          const mine = crops.filter((c) => c.topic === topic);
          const st = STATUS[m.status];
          const crop = TOPICS[topic].crop;
          return (
            <li key={topic} class="topic-row">
              <svg class="topic-icon" viewBox="-30 -58 60 64" width="44" height="44" aria-hidden="true">
                <use href={cropHref(crop, 3)} />
              </svg>
              <div class="topic-main">
                <b>{topic}</b>
                <span class="muted">
                  {CROP_NAMES[crop]} · {mine.length} growing · {mine.filter((c) => isThirsty(c, t)).length} thirsty · {s.harvested[topic] ?? 0} harvested
                </span>
              </div>
              <div class="topic-score">
                <Chip tone={st.tone}>{st.label}</Chip>
                <span class="muted">{m.n ? `${m.right}/${m.n}` : '–'}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p class="muted">RED &lt; 50% · YELLOW 50–79% · GREEN ≥ 80% (3+ answers). NEW = fewer than 3 answers.</p>
    </Panel>
  );
}
```

- [ ] **Step 6: Write `src/ui/activities/activities.css`**

```css
.practice-hero { display: flex; flex-direction: column; gap: 4px; padding: 16px; margin-bottom: 12px; border-radius: var(--radius); color: #fff; box-shadow: var(--shadow); }
.practice-hero.pond { background: linear-gradient(135deg, #4fc0f0, #2a85c9); }
.practice-hero.mine { background: linear-gradient(135deg, #8a7d70, #4b4038); }
.practice-hero b { font-size: 17px; }
.field-actions { margin: 10px 0 14px; }
.topic-list { list-style: none; margin: 0 0 12px; padding: 0; }
.topic-row { display: flex; align-items: center; gap: 10px; padding: 10px; margin-bottom: 8px; border-radius: 14px; background: var(--paper); border: 2px solid var(--line); }
.topic-icon { flex: 0 0 44px; border-radius: 12px; background: #f5ead6; }
.topic-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topic-score { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
```

- [ ] **Step 7: Register the panels**

In `src/app/panels.tsx` add the imports:
```tsx
import { FieldPanel } from '../ui/activities/FieldPanel';
import { PracticePanel } from '../ui/activities/PracticePanel';
```
and add these cases immediately above `default:`:
```tsx
    case 'practice':
      return <PracticePanel key={`${p.subject}:${p.area ?? '*'}`} subject={p.subject} area={p.area} />;
    case 'field':
      return <FieldPanel field={p.field} />;
```

- [ ] **Step 8: Run all tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: all files pass (activities 4, plus earlier); tsc exit 0.

- [ ] **Step 9: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: pond (A) and mine (B) practice panels and per-field mastery view

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 14: The House: diary, sleep, backup and Dojo import, offline download, settings

**Files:**
- Create: `src/app/clipboard.ts`, `src/app/offline.ts`, `src/ui/house/HousePanel.tsx`, `src/ui/house/house.css`, `tests/app/offline.test.ts`, `tests/ui/house.test.tsx`
- Modify: `src/app/panels.tsx` (add the `house` case)

**Interfaces:**
- Consumes: store (`save`, `today`, `update`, `flush`, `replaceSave`, `closePanel`, `showToast`) (Task 8); `defaultSave`, `exportSave`, `importBackup` (Task 4); `diaryReport` (Task 7); `Settings` (Task 4); `BANK`, `imageUrl` (Task 2); kit (Task 8).
- Produces: `copyText(text): Promise<boolean>`; `prefetchImages(urls, onProgress(done, failed), batch = 6): Promise<{done, failed}>`; `HousePanel()`, a dialog "House" with a `Sleep…` button, a textarea labeled `Diary report`, a textarea labeled `Paste backup text`, an `Import pasted text` button, an `Import file` input, a `Download all questions` button, checkboxes (Sound effects, Vibration, Battery saver, Keep 2026S clean…), and an erase button.

- [ ] **Step 1: Write the failing tests**

`tests/app/offline.test.ts`:
```ts
import { prefetchImages } from '../../src/app/offline';

describe('offline download', () => {
  it('fetches every url in small batches and counts failures', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: !url.includes('bad') }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const progress: number[] = [];
    const r = await prefetchImages(['a', 'b', 'bad', 'c'], (done) => progress.push(done), 2);
    expect(r).toEqual({ done: 4, failed: 1 });
    expect(progress).toEqual([2, 4]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    vi.unstubAllGlobals();
  });
});
```

`tests/ui/house.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { now, save } from '../../src/app/store';
import { defaultSave, exportSave } from '../../src/core/save';
import { HousePanel } from '../../src/ui/house/HousePanel';

const dojo = {
  att: { '2025S_A_Q01': [{ d: '2026-10-14', p: 'c', ok: false, c: 'S', t: 70, tag: 'K', cue: '', m: 'practice' }] },
  rev: { '2025S_A_Q01': { due: '2026-10-15', step: 0, clean: 0, last: '2026-10-14', sbw: true } },
  mocks: [],
};

const paste = (text: string) => {
  fireEvent.input(screen.getByLabelText('Paste backup text'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Import pasted text' }));
};

beforeEach(() => {
  save.value = defaultSave();
  now.value = new Date(2026, 9, 16, 20, 0).getTime();
});

describe('house', () => {
  it("shows today's diary report", () => {
    render(<HousePanel />);
    expect((screen.getByLabelText('Diary report') as HTMLTextAreaElement).value).toContain('Byte Harvest diary · 2026-10-16 · D-9');
  });

  it('imports a pasted Dojo backup and says what happened', () => {
    render(<HousePanel />);
    paste(JSON.stringify(dojo));
    expect(save.value.crops['paper:2025S_A_Q01']).toMatchObject({ sbw: true, pest: 'K' });
    expect(screen.getByText('Dojo import: 1 answer, 1 crop planted, 0 mocks.')).toBeInTheDocument();
  });

  it('explains a wrong file and keeps the farm', () => {
    save.value = { ...defaultSave(), gold: 50 };
    render(<HousePanel />);
    paste('{"not":"a backup"}');
    expect(screen.getByText("That file isn't a Byte Harvest or Dojo backup.")).toBeInTheDocument();
    expect(save.value.gold).toBe(50);
  });

  it('asks before replacing the farm with a game backup', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<HousePanel />);
    paste(exportSave({ ...defaultSave(), gold: 999 }, new Date()));
    expect(confirm).toHaveBeenCalled();
    expect(save.value.gold).toBe(0);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Import pasted text' }));
    expect(save.value.gold).toBe(999);
    confirm.mockRestore();
  });

  it('toggles battery saver and the 2026S hold', () => {
    render(<HousePanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Battery saver/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Keep 2026S clean/ }));
    expect(save.value.settings.batterySaver).toBe(true);
    expect(save.value.hold).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/app/offline.test.ts tests/ui/house.test.tsx`
Expected: FAIL with `Failed to resolve import "../../src/app/offline"` and `.../house/HousePanel`.

- [ ] **Step 3: Write `src/app/clipboard.ts` and `src/app/offline.ts`**

`src/app/clipboard.ts`:
```ts
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea trick
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
```

`src/app/offline.ts`:
```ts
/** Fetch images through the service worker so its "papers" cache fills up for offline play. */
export async function prefetchImages(
  urls: string[],
  onProgress: (done: number, failed: number) => void,
  batch = 6,
): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  for (let i = 0; i < urls.length; i += batch) {
    const results = await Promise.all(
      urls.slice(i, i + batch).map((u) =>
        fetch(u)
          .then((r) => r.ok)
          .catch(() => false),
      ),
    );
    failed += results.filter((ok) => !ok).length;
    done += results.length;
    onProgress(done, failed);
  }
  return { done, failed };
}
```

- [ ] **Step 4: Write `src/ui/house/HousePanel.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { copyText } from '../../app/clipboard';
import { prefetchImages } from '../../app/offline';
import { closePanel, flush, replaceSave, save, showToast, today, update } from '../../app/store';
import { diaryReport } from '../../core/report';
import { defaultSave, exportSave, importBackup } from '../../core/save';
import type { Settings } from '../../core/state';
import { BANK, imageUrl } from '../../data/bank';
import { Button, Panel } from '../kit';
import './house.css';

const SETTINGS: [keyof Settings, string, string][] = [
  ['sound', 'Sound effects', 'Soft blips on taps and answers'],
  ['haptics', 'Vibration', 'A short buzz on Android when you commit'],
  ['batterySaver', 'Battery saver', 'Stops ambient animation and walking (smoother on older phones)'],
];

const checked = (e: Event) => (e.target as HTMLInputElement).checked;

export function HousePanel() {
  const s = save.value;
  const t = today.value;
  const day = s.days[t];
  const report = diaryReport(s, t);
  const [paste, setPaste] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [dl, setDl] = useState<{ done: number; failed: number } | null>(null);
  const downloading = !!dl && dl.done < BANK.length;

  const sleep = async () => {
    flush();
    const copied = await copyText(report);
    document.documentElement.classList.add('sleeping');
    setTimeout(() => document.documentElement.classList.remove('sleeping'), 1600);
    showToast(copied ? 'Good night! Diary copied, so paste it into the reviewer chat.' : 'Good night! Copy the diary below for the reviewer chat.');
  };

  const doImport = (text: string) => {
    const r = importBackup(save.value, text, today.value);
    if (!r.ok) {
      setImportMsg(r.error);
      return;
    }
    if (r.kind === 'game' && !window.confirm('Replace the farm on this device with this backup?')) return;
    replaceSave(r.save);
    setImportMsg(r.summary);
    showToast(r.summary);
  };

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) doImport(await file.text());
    input.value = '';
  };

  const exportFile = () => {
    const blob = new Blob([exportSave(save.value, new Date())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `byte-harvest-${today.value}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const copySave = async () => {
    const ok = await copyText(exportSave(save.value, new Date()));
    showToast(ok ? 'Save copied as text. Paste it on your other device.' : 'Copy failed, so use Export file.');
  };

  const copyDiary = async () => {
    showToast((await copyText(report)) ? 'Diary copied.' : 'Copy failed. Select the text and copy it.');
  };

  const downloadAll = async () => {
    setDl({ done: 0, failed: 0 });
    const r = await prefetchImages(
      BANK.map((q) => imageUrl(q.id)),
      (done, failed) => setDl({ done, failed }),
    );
    showToast(r.failed ? `${r.failed} images failed. Try again while online.` : 'All 240 questions are saved for offline play.');
  };

  const reset = () => {
    if (window.confirm('Erase all progress on this device? Export a backup first if unsure.')) replaceSave(defaultSave());
  };

  return (
    <Panel title="House" onClose={closePanel}>
      <div class="card house-hero">
        <h3>Welcome home, {s.farmer}</h3>
        <p class="muted">
          Today: {day?.answered ?? 0} answered · {day?.correct ?? 0} right · {day?.planted ?? 0} planted · {day?.harvested ?? 0} harvested · {day?.focusMin ?? 0} min focus
        </p>
        <Button block variant="blue" onClick={sleep}>
          Sleep: end the day and copy the diary
        </Button>
      </div>

      <div class="card">
        <h3>Diary for the reviewer chat</h3>
        <textarea readOnly aria-label="Diary report" value={report} />
        <div class="row">
          <Button small onClick={copyDiary}>
            Copy diary
          </Button>
        </div>
      </div>

      <div class="card">
        <h3>Backup and moving to your phone</h3>
        <p class="muted">Progress lives in this browser. To move it, export it here and import it on the other device. A Dojo backup also works: its misses become crops.</p>
        <div class="row">
          <Button small onClick={exportFile}>
            Export file
          </Button>
          <Button small variant="ghost" onClick={copySave}>
            Copy save as text
          </Button>
          <label class="btn small ghost file-btn">
            Import file
            <input type="file" accept=".json,application/json" onChange={onFile} />
          </label>
        </div>
        <textarea
          aria-label="Paste backup text"
          placeholder="…or paste a Byte Harvest / Dojo backup here"
          value={paste}
          onInput={(e) => setPaste((e.target as HTMLTextAreaElement).value)}
        />
        <div class="row">
          <Button small onClick={() => doImport(paste)} disabled={!paste.trim()}>
            Import pasted text
          </Button>
        </div>
        {importMsg && (
          <p class="import-msg" role="status">
            {importMsg}
          </p>
        )}
      </div>

      <div class="card">
        <h3>Play offline</h3>
        <p class="muted">Questions download as you play. Save all 240 now (about 7 MB) so the farm works without data.</p>
        <Button small onClick={downloadAll} disabled={downloading}>
          {dl && dl.done < BANK.length ? `Downloading… ${dl.done}/${BANK.length}` : dl ? 'Download again' : 'Download all questions'}
        </Button>
      </div>

      <div class="card">
        <h3>Settings</h3>
        <label class="field-row">
          Farmer name
          <input
            type="text"
            value={s.farmer}
            maxLength={24}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value.trim();
              update((d) => {
                d.farmer = v || 'Farmer';
              });
            }}
          />
        </label>
        {SETTINGS.map(([k, label, hint]) => (
          <label key={k} class="toggle">
            <input
              type="checkbox"
              checked={s.settings[k]}
              onChange={(e) => {
                const v = checked(e);
                update((d) => {
                  d.settings[k] = v;
                });
              }}
            />
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
          </label>
        ))}
        <label class="toggle">
          <input
            type="checkbox"
            checked={s.hold}
            onChange={(e) => {
              const v = checked(e);
              update((d) => {
                d.hold = v;
              });
            }}
          />
          <span>
            <b>Keep 2026S clean for the mock</b>
            <small>Hides 2026S from practice until its full mock is recorded</small>
          </span>
        </label>
      </div>

      <div class="card danger-zone">
        <h3>Start over</h3>
        <Button small variant="danger" onClick={reset}>
          Erase progress on this device
        </Button>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 5: Write `src/ui/house/house.css`**

```css
.house-hero { background: linear-gradient(135deg, #fff6e3, #fde9c8); }
.file-btn { position: relative; overflow: hidden; }
.file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.toggle { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); cursor: pointer; }
.toggle input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--green); }
.toggle span { display: flex; flex-direction: column; }
.toggle small { color: var(--mute); }
.import-msg { font-weight: 800; }
.danger-zone { border-color: #f0c9bf; }
.sleeping .stage::after {
  content: ''; position: absolute; inset: 0; z-index: 4; pointer-events: none;
  background: #141a3c; animation: sleep-fade 1.6s ease-in-out forwards;
}
@keyframes sleep-fade { 0% { opacity: 0; } 40%, 60% { opacity: 0.85; } 100% { opacity: 0; } }
```

- [ ] **Step 6: Register the house panel**

In `src/app/panels.tsx` add the import:
```tsx
import { HousePanel } from '../ui/house/HousePanel';
```
and add this case immediately above `default:`:
```tsx
    case 'house':
      return <HousePanel />;
```

`src/app/panels.tsx` should now read exactly:
```tsx
import { FieldPanel } from '../ui/activities/FieldPanel';
import { PracticePanel } from '../ui/activities/PracticePanel';
import { AlmanacPanel } from '../ui/Almanac';
import { HousePanel } from '../ui/house/HousePanel';
import { Panel } from '../ui/kit';
import { Session } from '../ui/paper/Session';
import type { PanelState } from './panel-types';
import { closePanel } from './store';

export function PanelHost({ panel }: { panel: PanelState }) {
  return <div class="panel-layer">{renderPanel(panel)}</div>;
}

function renderPanel(p: PanelState) {
  switch (p.kind) {
    case 'almanac':
      return <AlmanacPanel />;
    case 'session':
      return <Session key={`${p.title}:${p.ids.join(',')}`} ids={p.ids} mode={p.mode} title={p.title} />;
    case 'practice':
      return <PracticePanel key={`${p.subject}:${p.area ?? '*'}`} subject={p.subject} area={p.area} />;
    case 'field':
      return <FieldPanel field={p.field} />;
    case 'house':
      return <HousePanel />;
    default:
      return (
        <Panel title="Coming soon" onClose={closePanel}>
          <p class="muted">This part of the farm is still being built.</p>
        </Panel>
      );
  }
}
```

- [ ] **Step 7: Run all tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: all files pass (offline 1, house 5, plus earlier); tsc exit 0.

- [ ] **Step 8: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: house with sleep+diary copy, backups, Dojo import, offline download and settings

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Stamina bar and 3-minute breaks

**Files:**
- Create: `src/app/staminaStore.ts`, `src/ui/StaminaBar.tsx`, `src/ui/RestOverlay.tsx`, `src/ui/stamina.css`, `tests/app/stamina.test.tsx`
- Modify: `src/ui/Hud.tsx` (swap the spacer for the stamina bar), `src/app/App.tsx` (start stamina, render the overlay)

**Interfaces:**
- Consumes: `REST_MS`, `FOCUS_BLOCK_MS`, `markActivity`, `needsRest`, `newStamina`, `rested`, `tick`, `staminaPct`, `StaminaState` (Task 7); `ensureDay` (Task 4); store (Task 8); `fmtClock` (Task 3); `Button`, `LeafIcon` (Task 8).
- Produces: signals `stamina`, `resting`; `stepStamina(nowMs)`, `finishRest()`, `startStamina(): () => void`, `useStamina()`; `StaminaBar()` (aria-label `Stamina N%`); `RestOverlay()` (dialog "Break time", with buttons `Resting…`/`I'm back: refill stamina` and `Skip this break`).

- [ ] **Step 1: Write the failing tests**

`tests/app/stamina.test.tsx`:
```tsx
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { resting, stamina, stepStamina } from '../../src/app/staminaStore';
import { now, save, today } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { FOCUS_BLOCK_MS, newStamina } from '../../src/core/stamina';
import { RestOverlay } from '../../src/ui/RestOverlay';
import { StaminaBar } from '../../src/ui/StaminaBar';

beforeEach(() => {
  save.value = defaultSave();
  resting.value = null;
});

describe('stamina', () => {
  it('asks for a 3-minute break after 25 focused minutes', () => {
    const t0 = Date.now();
    now.value = t0;
    stamina.value = { ...newStamina(today.value, t0), sinceBreakMs: FOCUS_BLOCK_MS - 10_000 };
    act(() => stepStamina(t0 + 15_000));
    expect(resting.value).not.toBeNull();
    render(<RestOverlay />);
    expect(screen.getByRole('dialog', { name: 'Break time' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resting…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Skip this break' }));
    expect(resting.value).toBeNull();
    expect(stamina.value.sinceBreakMs).toBe(0);
  });

  it('logs focus minutes into the day', () => {
    const t0 = Date.now();
    now.value = t0;
    stamina.value = newStamina(today.value, t0, 4 * 60_000 + 50_000);
    act(() => stepStamina(t0 + 15_000));
    expect(save.value.days[today.value].focusMin).toBe(5);
  });

  it('shows the stamina level in the HUD bar', () => {
    stamina.value = { ...newStamina('2026-10-16', 0), sinceBreakMs: FOCUS_BLOCK_MS / 2 };
    render(<StaminaBar />);
    expect(screen.getByLabelText('Stamina 50%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/byte-harvest && npx vitest run tests/app/stamina.test.tsx`
Expected: FAIL with `Failed to resolve import "../../src/app/staminaStore"`.

- [ ] **Step 3: Write `src/app/staminaStore.ts`**

```ts
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { REST_MS, markActivity, needsRest, newStamina, rested, tick, type StaminaState } from '../core/stamina';
import { ensureDay } from '../core/state';
import { save, today, update } from './store';

export const stamina = signal<StaminaState>(newStamina('', 0));
export const resting = signal<{ until: number } | null>(null);

const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

export function stepStamina(nowMs: number): void {
  const t = today.value;
  const st = tick(stamina.value, nowMs, t);
  stamina.value = st;
  const minutes = Math.floor(st.focusMsToday / 60_000);
  if ((save.value.days[t]?.focusMin ?? 0) !== minutes) {
    update((s) => {
      ensureDay(s, t).focusMin = minutes;
    });
  }
  if (needsRest(st) && !resting.value) resting.value = { until: nowMs + REST_MS };
}

export function finishRest(): void {
  stamina.value = rested(stamina.value);
  resting.value = null;
}

export function startStamina(): () => void {
  const t = today.value;
  stamina.value = newStamina(t, Date.now(), (save.value.days[t]?.focusMin ?? 0) * 60_000);
  const onActivity = () => {
    stamina.value = markActivity(stamina.value, Date.now());
  };
  ACTIVITY.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
  const timer = setInterval(() => stepStamina(Date.now()), 15_000);
  return () => {
    ACTIVITY.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
    clearInterval(timer);
  };
}

export function useStamina(): void {
  useEffect(() => startStamina(), []);
}
```

- [ ] **Step 4: Write `src/ui/StaminaBar.tsx`, `src/ui/RestOverlay.tsx`, `src/ui/stamina.css`**

`src/ui/StaminaBar.tsx`:
```tsx
import { stamina } from '../app/staminaStore';
import { staminaPct } from '../core/stamina';
import { LeafIcon } from './icons';
import './stamina.css';

export function StaminaBar() {
  const pct = Math.round(staminaPct(stamina.value));
  return (
    <div class="stamina" aria-label={`Stamina ${pct}%`} title="Stamina refills after a short break">
      <LeafIcon />
      <div class="bar">
        <i style={{ width: `${pct}%`, background: pct < 25 ? 'var(--red)' : 'var(--green)' }} />
      </div>
    </div>
  );
}
```

`src/ui/RestOverlay.tsx`:
```tsx
import { useEffect, useState } from 'preact/hooks';
import { finishRest, resting } from '../app/staminaStore';
import { fmtClock } from '../core/dates';
import { Button } from './kit';
import './stamina.css';

export function RestOverlay() {
  const r = resting.value;
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (!r) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [r]);
  if (!r) return null;
  const left = Math.max(0, Math.ceil((r.until - nowMs) / 1000));
  return (
    <div class="rest-layer" role="dialog" aria-label="Break time">
      <div class="rest-card">
        <svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">
          <circle cx="92" cy="22" r="14" fill="#ffd76a" />
          <circle cx="98" cy="18" r="12" fill="#2b3a67" />
          <path d="M10 70Q60 40 110 70Z" fill="#6cc04a" />
          <text x="30" y="40" font-size="16" font-weight="900" fill="#8fa3d9">z</text>
          <text x="42" y="28" font-size="20" font-weight="900" fill="#8fa3d9">z</text>
        </svg>
        <h2>Your farmer needs a break</h2>
        <p>That was 25 focused minutes. Stand up, stretch, drink some water, and look at something far away.</p>
        <div class="rest-clock">{fmtClock(left)}</div>
        <Button block disabled={left > 0} onClick={finishRest}>
          {left > 0 ? 'Resting…' : "I'm back: refill stamina"}
        </Button>
        <button type="button" class="link-btn" onClick={finishRest}>
          Skip this break
        </button>
      </div>
    </div>
  );
}
```

`src/ui/stamina.css`:
```css
.stamina { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 70px; max-width: 170px; margin: 0 auto; }
.stamina .bar { flex: 1; }
.rest-layer { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 20px; background: rgba(20, 26, 60, 0.82); }
.rest-card { width: min(420px, 100%); padding: 22px; border-radius: 22px; background: var(--paper); text-align: center; box-shadow: var(--shadow); }
.rest-card h2 { margin: 6px 0; font-size: 22px; font-weight: 900; }
.rest-clock { margin: 10px 0 14px; font-size: 44px; font-weight: 900; font-variant-numeric: tabular-nums; }
.link-btn { margin-top: 10px; min-height: 44px; border: 0; background: none; color: var(--mute); text-decoration: underline; cursor: pointer; }
```

- [ ] **Step 5: Wire it into the HUD and App**

In `src/ui/Hud.tsx` add the import:
```tsx
import { StaminaBar } from './StaminaBar';
```
and replace:
```tsx
      <span class="hud-spacer" />
```
with:
```tsx
      <StaminaBar />
```

In `src/app/App.tsx` add the imports:
```tsx
import { RestOverlay } from '../ui/RestOverlay';
import { useStamina } from './staminaStore';
```
add the hook call directly below `useEffect(() => startClock(), []);`:
```tsx
  useStamina();
```
and add the overlay directly below `<ToastHost />`:
```tsx
      <RestOverlay />
```

- [ ] **Step 6: Run all tests and typecheck**

Run: `cd ~/byte-harvest && npx vitest run && npm run typecheck`
Expected: all files pass (stamina 3, plus earlier); tsc exit 0.

- [ ] **Step 7: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: stamina bar and a 3-minute break after every 25 focused minutes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Installable, offline PWA

**Files:**
- Create: `public/icons/logo.svg`, `scripts/make-icons.mjs`, `scripts/check-pwa.mjs`
- Generated (committed): `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`
- Modify: `vite.config.ts` (full rewrite), `src/main.tsx` (register the service worker), `index.html` (icon links)

**Interfaces:**
- Consumes: the built app.
- Produces: `dist/sw.js` that precaches the app shell, icons, and the latin Nunito font, plus a runtime `CacheFirst` cache named `papers` for `/papers/*.webp`; `dist/manifest.webmanifest` (`start_url` and `scope` `/byte-harvest/`, standalone); `npm run check:pwa`.

- [ ] **Step 1: Write the failing check**

`scripts/check-pwa.mjs`:
```js
import { existsSync, readFileSync } from 'node:fs';

const fail = (msg) => {
  console.error(`PWA check failed: ${msg}`);
  process.exit(1);
};

for (const f of [
  'dist/sw.js',
  'dist/manifest.webmanifest',
  'dist/icons/icon-192.png',
  'dist/icons/icon-512.png',
  'dist/icons/maskable-512.png',
  'dist/papers/2025S_A_Q01.webp',
]) {
  if (!existsSync(f)) fail(`missing ${f}`);
}
const sw = readFileSync('dist/sw.js', 'utf8');
if (sw.includes('.webp')) fail('question images must not be precached (they are cached on demand)');
if (!sw.includes('papers')) fail('the "papers" runtime cache is missing');
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.start_url !== '/byte-harvest/') fail(`start_url is ${manifest.start_url}`);
if (manifest.display !== 'standalone') fail('display must be standalone');
console.log('PWA check passed');
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `cd ~/byte-harvest && npm run build && npm run check:pwa`
Expected: build succeeds, then `PWA check failed: missing dist/sw.js` (exit 1).

- [ ] **Step 3: Draw the logo and render the icons**

`public/icons/logo.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7fd38a"/>
      <stop offset="1" stop-color="#2f8f4e"/>
    </linearGradient>
    <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a8714a"/>
      <stop offset="1" stop-color="#7a4b2e"/>
    </linearGradient>
    <clipPath id="tile">
      <rect width="512" height="512" rx="112"/>
    </clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <circle cx="388" cy="124" r="52" fill="#ffd76a"/>
    <path d="M0 410Q256 300 512 410V512H0Z" fill="url(#soil)"/>
    <path d="M256 372C256 300 250 250 256 196" stroke="#2f6b2a" stroke-width="18" fill="none" stroke-linecap="round"/>
    <path d="M256 252C200 232 160 182 170 130C226 140 260 190 256 252Z" fill="#9be15d"/>
    <path d="M256 222C310 202 350 152 344 104C290 112 252 160 256 222Z" fill="#6cc04a"/>
    <text x="256" y="452" text-anchor="middle" font-family="monospace" font-size="54" font-weight="700" fill="#ffe9c7">1010</text>
  </g>
</svg>
```

`scripts/make-icons.mjs`:
```js
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const logo = readFileSync('public/icons/logo.svg', 'utf8').replace('<svg ', '<svg width="100%" height="100%" ');
// Rounded tile for browser/desktop icons; full-bleed square where the launcher applies its own mask.
const targets = [
  { file: 'icon-192.png', size: 192, square: false },
  { file: 'icon-512.png', size: 512, square: false },
  { file: 'apple-touch-icon.png', size: 180, square: true },
  { file: 'maskable-512.png', size: 512, square: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const svg = t.square ? logo.replace('rx="112"', 'rx="0"') : logo;
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0"><div style="width:${t.size}px;height:${t.size}px">${svg}</div></body></html>`);
  await page.screenshot({ path: `public/icons/${t.file}`, omitBackground: !t.square });
}
await browser.close();
console.log('Icons written to public/icons/');
```

Run: `cd ~/byte-harvest && npx playwright install chromium && npm run icons`
Expected: `Icons written to public/icons/`; four PNGs exist (`ls public/icons`).

- [ ] **Step 4: Configure vite-plugin-pwa (replace `vite.config.ts`)**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/byte-harvest/',
  plugins: [
    preact({ prefreshEnabled: !process.env.VITEST }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeManifestIcons: false, // the png glob below already precaches them
      manifest: {
        name: 'Byte Harvest — FE Farm',
        short_name: 'Byte Harvest',
        description: 'A cozy farm game for PhilNITS FE review',
        theme_color: '#3a9a5b',
        background_color: '#fdf8ec',
        display: 'standalone',
        orientation: 'any',
        start_url: '/byte-harvest/',
        scope: '/byte-harvest/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}', '**/nunito-latin-wght-normal-*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/papers/'),
            handler: 'CacheFirst',
            options: { cacheName: 'papers', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: Register the service worker and add icon links**

Replace `src/main.tsx`:
```tsx
import '@fontsource-variable/nunito';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
```

In `index.html`, add these two lines directly below the `<meta name="description" …>` line:
```html
    <link rel="icon" type="image/png" href="%BASE_URL%icons/icon-192.png" />
    <link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon.png" />
```

- [ ] **Step 6: Run the check to verify it passes**

Run: `cd ~/byte-harvest && npm run build && npm run check:pwa && npx vitest run`
Expected: `PWA check passed`; all unit tests still pass.

- [ ] **Step 7: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "feat: installable offline PWA (app-shell precache, on-demand question cache, icons)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: End-to-end checks on a 360×800 phone and a PC, plus the size budget

**Files:**
- Create: `playwright.config.ts`, `e2e/farm.spec.ts`, `scripts/check-budget.mjs`

**Interfaces:**
- Consumes: the built app (`npm run build`, `vite preview` on port 4173).
- Produces: `npm run e2e` (mobile and desktop projects; set `BASE_URL` to test a deployed site instead) and `npm run budget` (fails if JS > 120 KB gzip or CSS > 20 KB gzip).

- [ ] **Step 1: Write the budget gate and the Playwright config**

`scripts/check-budget.mjs`:
```js
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMITS = { js: 120 * 1024, css: 20 * 1024 };
const total = { js: 0, css: 0 };
for (const f of readdirSync('dist/assets')) {
  const ext = f.endsWith('.js') ? 'js' : f.endsWith('.css') ? 'css' : null;
  if (ext) total[ext] += gzipSync(readFileSync(`dist/assets/${f}`)).length;
}
const kb = (n) => (n / 1024).toFixed(1);
console.log(`JS ${kb(total.js)} KB gz (limit ${kb(LIMITS.js)}) · CSS ${kb(total.css)} KB gz (limit ${kb(LIMITS.css)})`);
if (total.js > LIMITS.js || total.css > LIMITS.css) {
  console.error('Bundle budget exceeded');
  process.exit(1);
}
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

// 127.0.0.1, not localhost: on this WSL, localhost resolves to ::1 and the HTTP proxy only bypasses 127.0.0.1.
const remote = process.env.BASE_URL;
const proxy = remote && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: remote ?? 'http://127.0.0.1:4173/byte-harvest/', trace: 'retain-on-failure', proxy },
  webServer: remote
    ? undefined
    : {
        command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173/byte-harvest/',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 12; SM-A217F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
});
```

- [ ] **Step 2: Write the end-to-end tests**

`e2e/farm.spec.ts`:
```ts
import { expect, test, type Page } from '@playwright/test';

// Each Playwright test starts in a fresh browser context, so storage is already empty.
// (Clearing localStorage under a running app doesn't work: its pagehide save writes the state back.)
async function freshFarm(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: 'Almanac' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}

test('opens to the farm with the almanac and HUD', async ({ page }) => {
  await freshFarm(page);
  await expect(page.getByLabel('Farm', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open almanac/ })).toContainText(/D-\d+|Festival/);
});

test('a sure-but-wrong miss plants a golden crop that survives a reload', async ({ page }) => {
  await freshFarm(page);
  await page.getByRole('button', { name: /^Pond/ }).click();
  await page.getByRole('combobox', { name: 'Paper', exact: true }).selectOption('2025S');
  await page.getByRole('combobox', { name: 'Order', exact: true }).selectOption('paper');
  await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Cast the line' }).click();
  await expect(page.getByText('(2025S, FE, Subject-A, Q1)')).toBeVisible();
  await page.getByRole('button', { name: 'b', exact: true }).click();
  await page.getByRole('button', { name: '1 · Sure' }).click();
  await page.getByRole('button', { name: 'Commit answer' }).click();
  await expect(page.getByText(/Sure but wrong/)).toBeVisible();
  await page.getByRole('button', { name: /K · Blight/ }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('[data-crop="paper:2025S_A_Q01"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-crop="paper:2025S_A_Q01"]')).toHaveCount(1);
});

test('no horizontal scrolling on a 360 px phone, even on a tall Subject B question', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone-only check');
  await freshFarm(page);
  await page.getByRole('button', { name: /^Mine/ }).click();
  await page.getByRole('combobox', { name: 'Paper', exact: true }).selectOption('2025S');
  await page.getByRole('combobox', { name: 'Order', exact: true }).selectOption('paper');
  await page.getByRole('button', { name: 'Start mining' }).click();
  const img = page.getByRole('img', { name: /2025S, FE, Subject-B, Q1\)/ });
  await expect(img).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await img.click();
  await expect(page.getByRole('dialog', { name: 'Zoomed question' })).toBeVisible();
  await page.getByRole('button', { name: 'Close zoom' }).click();
});

test('keeps the farm visible beside panels on a PC', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop-only check');
  await freshFarm(page);
  await page.getByRole('button', { name: /^Pond/ }).click();
  await expect(page.getByRole('dialog', { name: 'Pond · Subject A' })).toBeVisible();
  const farm = page.getByLabel('Farm', { exact: true });
  await expect(farm).toBeVisible();
  expect((await farm.boundingBox())!.width).toBeGreaterThan(300);
});

test('works offline after the first visit', async ({ page, context }) => {
  await freshFarm(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Farm', { exact: true })).toBeVisible();
  await context.setOffline(false);
});
```

- [ ] **Step 3: Run the end-to-end tests**

Run: `cd ~/byte-harvest && npx playwright install chromium && npm run e2e`
Expected: `8 passed, 2 skipped` (5 tests × 2 projects; the phone-only and desktop-only checks each skip once).

If a test fails, open the trace (`npx playwright show-trace test-results/**/trace.zip`), fix the app code (not the expectation), and re-run.

- [ ] **Step 4: Check the size budget and take screenshots**

Run as one command:
```bash
cd ~/byte-harvest
npm run build && npm run budget
./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173 --strictPort > /tmp/bh-preview.log 2>&1 &
SERVER=$!
sleep 3
npx playwright screenshot --viewport-size=360,800 http://127.0.0.1:4173/byte-harvest/ /tmp/byte-harvest-mobile.png
npx playwright screenshot --viewport-size=1366,768 http://127.0.0.1:4173/byte-harvest/ /tmp/byte-harvest-desktop.png
kill $SERVER
```
Expected: `JS … KB gz (limit 120.0) · CSS … KB gz (limit 20.0)` with no "exceeded" line. Then open both PNGs with the Read tool. The farm should look polished, with no overlapping labels and the almanac panel open. Fix any visual problem before committing.

- [ ] **Step 5: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "test: Playwright e2e on 360x800 phone and PC, offline check, bundle budget

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Deploy to GitHub Pages and install on the phone

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: everything above; GitHub account `zendrix-hub`.
- Produces: public repo `zendrix-hub/byte-harvest`; live site `https://zendrix-hub.github.io/byte-harvest/`; every push to `main` re-deploys after the tests pass.

- [ ] **Step 1: Write the workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run budget
      - run: npm run check:pwa
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `README.md`**

```markdown
# Byte Harvest 🌱

A cozy farm game for reviewing the **PhilNITS / ITPEC FE exam (Sun Oct 25, 2026)**.

- **Fish at the pond** for Subject A past-paper questions, and **dig in the mine** for Subject B.
- **Every miss becomes a seed.** Water it on later days (+1 day, then +2) until it is ready to harvest.
- **Golden crops** (sure but wrong) come first. **Pests** (K/C/N/M/T) tag why you missed.
- The **almanac** follows the Oct 16–25 plan. In the **House**, sleep copies the diary for the reviewer chat.

Play: https://zendrix-hub.github.io/byte-harvest/. On Android, open it in Chrome, then tap ⋮ → **Install app**. Open it once while online, then go to House → **Download all questions** to play offline.

## Develop

    npm install
    npm run dev        # http://localhost:5173/byte-harvest/
    npm test           # unit + component tests
    npm run e2e        # Playwright: 360×800 phone + 1366×768 PC
    npm run build && npm run budget && npm run check:pwa

Question images and keys come from ITPEC's publicly released FE past papers (2025S, 2025A, 2026S) and are used here for personal study.
```

- [ ] **Step 3: Commit**

```bash
cd ~/byte-harvest
git add -A
git commit -m "ci: deploy to GitHub Pages on push to main

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Sign in to GitHub (the user does this step)**

Ask the user to run this in the Claude Code prompt and pick the `zendrix-hub` account. The `workflow` scope is needed to push `.github/workflows`.
```
! gh auth login --web --git-protocol https --scopes workflow
```
Then verify:
Run: `gh auth status && gh auth setup-git`
Expected: `Logged in to github.com account zendrix-hub` with `workflow` among the token scopes.

- [ ] **Step 5: Create the repo and push. Confirm with the user first**

This publishes the code and the question images in a **public** repo. Ask the user to confirm before running:
```bash
cd ~/byte-harvest
gh repo create zendrix-hub/byte-harvest --public --source . --remote origin --push --description "Cozy farm game for PhilNITS FE review"
```
Expected: `✓ Created repository zendrix-hub/byte-harvest` and `✓ Pushed commits`.

- [ ] **Step 6: Turn on Pages (GitHub Actions source) and run the deploy**

```bash
gh api -X POST repos/zendrix-hub/byte-harvest/pages -f build_type=workflow || gh api -X PUT repos/zendrix-hub/byte-harvest/pages -f build_type=workflow
gh workflow run deploy.yml --repo zendrix-hub/byte-harvest
sleep 5
gh run watch --repo zendrix-hub/byte-harvest --exit-status "$(gh run list --repo zendrix-hub/byte-harvest --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```
Expected: the build and deploy jobs both finish with ✓. (The run started by the first push may have failed at deploy because Pages wasn't enabled yet. The manual run supersedes it.)

- [ ] **Step 7: Verify the live site**

Run:
```bash
curl -sI https://zendrix-hub.github.io/byte-harvest/ | head -1
curl -s https://zendrix-hub.github.io/byte-harvest/manifest.webmanifest | head -c 120; echo
cd ~/byte-harvest && BASE_URL=https://zendrix-hub.github.io/byte-harvest/ npx playwright test --project=mobile -g "opens to the farm|golden crop"
```
Expected: `HTTP/2 200`, a manifest starting `{"name":"Byte Harvest — FE Farm"`, and `2 passed`.

- [ ] **Step 8: Hand the phone steps to the user**

Tell the user:
1. On the Samsung A21s, open **https://zendrix-hub.github.io/byte-harvest/** in Chrome, then tap ⋮ → **Install app** (or **Add to Home screen**).
2. Open it from the home screen while online, then go to **House → Download all questions** (about 7 MB) so it works offline.
3. To bring Dojo history in, open the Dojo, go to Progress → **Export backup**, then in the game go to House → **Import file**. Misses become crops.
4. To move progress between PC and phone, use House → **Copy save as text** on one device and **Paste backup text → Import** on the other.

---

## After M1: the next plans (one per milestone, per the spec)

| Plan | Ship by | Starts from |
|---|---|---|
| M2 Town & Seed Packets: lesson engine (`mcq`/`match`/`bucket`/`order`/`numeric`), concept crops, every strategy & management subtopic, villagers, decor shop | Sun Oct 18 | `PanelState` gets `{kind:'town'}` and `{kind:'lesson', id}`; `CropSource 'concept'` already exists in `state.ts` |
| M3 Greenhouse: Development + Database lessons and widgets | Mon Oct 19 | the M2 lesson engine |
| M4 Mine depths: ITPEC pseudo-language interpreter, desk-check trace floors | Tue Oct 20 | the Mine panel gains a "Trace floors" tab |
| M5 Workshop & Watchtower: calculation generators with worked steps, plus tech and security lessons; enforces the coverage test | Wed Oct 21 | `mulberry32` for reproducible fresh variants |
| M6 Harvest Festival: timed blitz, full mocks with OMR grid, Top-20 cards, rest-day and exam-day modes | Thu Oct 22 | `mockDone`/`MockRecord` already feed the 2026S hold |
