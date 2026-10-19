// node validate.mjs <id> [...]  — checks /tmp/bh-qwork/json/<id>.json against FORMAT.md
import { existsSync, readFileSync } from 'node:fs';

const bank = Object.fromEntries(JSON.parse(readFileSync(`${process.env.HOME}/byte-harvest/src/data/bank.json`, 'utf8')).map((q) => [q.id, q]));
const LET = 'abcdefghij';
const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('usage: node validate.mjs <id> [...]');
  process.exit(2);
}

function checkInline(s, where, errs) {
  if (typeof s !== 'string') return errs.push(`${where}: not a string`);
  if ((s.match(/`/g) ?? []).length % 2) errs.push(`${where}: unbalanced backtick`);
  if ((s.match(/\*\*/g) ?? []).length % 2) errs.push(`${where}: unbalanced **`);
  let depth = 0;
  for (const ch of s.replace(/`[^`]*`/g, '')) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) errs.push(`${where}: unbalanced { }`);
  if (/<\/?[a-zA-Z][^>]*>/.test(s.replace(/`[^`]*`/g, ''))) errs.push(`${where}: looks like HTML — use the inline markup`);
  if (/_{3,}/.test(s)) errs.push(`${where}: "___" left over — write blanks as [[A]]`);
  if (/⟦code⟧/.test(s)) errs.push(`${where}: extraction marker left over`);
  if (/\\(frac|sqrt|times|overline|mathrm)/.test(s)) errs.push(`${where}: LaTeX is not allowed`);
}

function checkSvg(svg, where, errs) {
  if (typeof svg !== 'string' || !svg.trim().startsWith('<svg')) return errs.push(`${where}: must start with <svg`);
  if (!/viewBox\s*=/.test(svg)) errs.push(`${where}: missing viewBox`);
  if (!/<\/svg>\s*$/.test(svg.trim())) errs.push(`${where}: must end with </svg>`);
  if (/<script|<foreignObject|<image|<iframe|<use[^>]+href\s*=\s*["']?https?:|\son[a-z]+\s*=|javascript:|@import|xlink:href\s*=\s*["']?https?:/i.test(svg))
    errs.push(`${where}: forbidden SVG content`);
  const tags = svg.match(/<([a-zA-Z]+)/g)?.map((t) => t.slice(1)) ?? [];
  const ok = new Set(['svg', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'defs', 'marker', 'title']);
  const bad = [...new Set(tags.filter((t) => !ok.has(t)))];
  if (bad.length) errs.push(`${where}: element(s) not allowed: ${bad.join(', ')}`);
}

function checkBlock(b, where, errs) {
  if (!b || typeof b !== 'object') return errs.push(`${where}: not an object`);
  switch (b.t) {
    case 'p':
    case 'note':
      return checkInline(b.x, where, errs);
    case 'code':
      if (typeof b.x !== 'string' || !b.x.trim()) errs.push(`${where}: empty code`);
      if (/_{3,}/.test(b.x ?? '')) errs.push(`${where}: "___" in code — write blanks as [[A]]`);
      if (/⟦code⟧/.test(b.x ?? '')) errs.push(`${where}: extraction marker left over`);
      return;
    case 'list':
      if (!Array.isArray(b.items) || !b.items.length) return errs.push(`${where}: list needs items`);
      return b.items.forEach((x, i) => checkInline(x, `${where}.items[${i}]`, errs));
    case 'table': {
      if (!Array.isArray(b.rows) || !b.rows.length) return errs.push(`${where}: table needs rows`);
      const w = b.rows[0].length;
      b.rows.forEach((r, i) => {
        if (!Array.isArray(r) || r.length !== w) errs.push(`${where}.rows[${i}]: expected ${w} cells`);
        else r.forEach((c, j) => checkInline(c, `${where}.rows[${i}][${j}]`, errs));
      });
      if (b.head !== undefined && !(Number.isInteger(b.head) && b.head >= 0 && b.head <= b.rows.length)) errs.push(`${where}: bad head`);
      return;
    }
    case 'svg':
      checkSvg(b.svg, where, errs);
      if (typeof b.alt !== 'string' || b.alt.length < 8) errs.push(`${where}: svg needs a descriptive alt`);
      return;
    default:
      errs.push(`${where}: unknown block type ${JSON.stringify(b.t)}`);
  }
}

let failed = 0;
for (const id of ids) {
  const errs = [];
  const file = `/tmp/bh-qwork/json/${id}.json`;
  const bq = bank[id];
  if (!bq) errs.push('unknown id');
  if (!existsSync(file)) errs.push(`missing ${file}`);
  else {
    let q;
    try {
      q = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      errs.push(`invalid JSON: ${e.message}`);
    }
    if (q) {
      if (q.id !== id) errs.push(`id field is ${q.id}`);
      const extra = Object.keys(q).filter((k) => !['id', 'stem', 'opts', 'optTable'].includes(k));
      if (extra.length) errs.push(`unexpected keys: ${extra.join(', ')}`);
      if (!Array.isArray(q.stem) || !q.stem.length) errs.push('stem must be a non-empty array');
      else q.stem.forEach((b, i) => checkBlock(b, `stem[${i}]`, errs));
      if (q.stem?.[0]?.t === 'p' && /^\s*Q\d+\./.test(q.stem[0].x)) errs.push('drop the leading "Qn." from the stem');
      if (!!q.opts === !!q.optTable) errs.push('use exactly one of opts / optTable');
      const need = bq ? Math.max(bq.nopt, LET.indexOf(bq.key) + 1) : 0;
      const letters = q.opts ? q.opts.map((o) => o.k) : q.optTable ? q.optTable.rows.map((r) => r.k) : [];
      if (letters.join('') !== LET.slice(0, need)) errs.push(`option letters ${letters.join('') || '(none)'} — expected ${LET.slice(0, need)}`);
      if (q.opts) q.opts.forEach((o, i) => (Array.isArray(o.b) && o.b.length ? o.b.forEach((b, j) => checkBlock(b, `opts[${i}].b[${j}]`, errs)) : errs.push(`opts[${i}]: empty`)));
      if (q.optTable) {
        const h = q.optTable.head;
        if (!Array.isArray(h) || !h.length) errs.push('optTable.head missing');
        else h.forEach((x, i) => checkInline(x, `optTable.head[${i}]`, errs));
        q.optTable.rows?.forEach((r, i) => {
          if (!Array.isArray(r.c) || r.c.length !== (h?.length ?? -1)) errs.push(`optTable.rows[${i}]: needs ${h?.length} cells`);
          else r.c.forEach((c, j) => checkInline(c, `optTable.rows[${i}].c[${j}]`, errs));
        });
      }
      const all = JSON.stringify(q);
      if (/correct answer|answer key|\bkey:/i.test(all)) errs.push('must not contain answer information');
    }
  }
  if (errs.length) {
    failed++;
    console.log(`FAIL ${id}\n  - ${errs.join('\n  - ')}`);
  } else console.log(`OK ${id}`);
}
process.exit(failed ? 1 : 0);
