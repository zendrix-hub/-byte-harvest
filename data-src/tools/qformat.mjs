// Shared parsing/rendering of the question-text format (mirrors FORMAT.md). Used by validate.mjs and render.mjs.
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function inlineHtml(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '`') {
      const j = s.indexOf('`', i + 1);
      if (j > i) {
        out += `<code>${esc(s.slice(i + 1, j))}</code>`;
        i = j + 1;
        continue;
      }
    }
    if (s.startsWith('**', i)) {
      const j = s.indexOf('**', i + 2);
      if (j > i) {
        out += `<b>${inlineHtml(s.slice(i + 2, j))}</b>`;
        i = j + 2;
        continue;
      }
    }
    if ((c === '^' || c === '_' || c === '~') && s[i + 1] === '{') {
      const j = matchBrace(s, i + 1);
      if (j > i) {
        const inner = inlineHtml(s.slice(i + 2, j));
        out += c === '^' ? `<sup>${inner}</sup>` : c === '_' ? `<sub>${inner}</sub>` : `<span class="ov">${inner}</span>`;
        i = j + 1;
        continue;
      }
    }
    if (s.startsWith('[[', i)) {
      const j = s.indexOf(']]', i + 2);
      if (j > i) {
        out += `<span class="blank">${esc(s.slice(i + 2, j))}</span>`;
        i = j + 2;
        continue;
      }
    }
    if (c === '\n') {
      out += '<br>';
      i++;
      continue;
    }
    out += esc(c);
    i++;
  }
  return out;
}

export const codeHtml = (s) => esc(s).replace(/\[\[([^\]]{1,6})\]\]/g, '<span class="blank">$1</span>');

export function blockHtml(b) {
  switch (b.t) {
    case 'p':
      return `<p>${inlineHtml(b.x)}</p>`;
    case 'note':
      return `<p class="note">${inlineHtml(b.x)}</p>`;
    case 'code':
      return `<pre>${codeHtml(b.x)}</pre>`;
    case 'list':
      return `<ul>${b.items.map((x) => `<li>${inlineHtml(x)}</li>`).join('')}</ul>`;
    case 'table': {
      const head = b.head ?? 1;
      return `<table>${b.rows.map((r, i) => `<tr>${r.map((c) => (i < head ? `<th>${inlineHtml(c)}</th>` : `<td>${inlineHtml(c)}</td>`)).join('')}</tr>`).join('')}</table>`;
    }
    case 'svg':
      return `<figure>${b.svg}<figcaption hidden>${esc(b.alt)}</figcaption></figure>`;
    default:
      return `<p style="color:red">UNKNOWN BLOCK ${esc(JSON.stringify(b))}</p>`;
  }
}

export function questionHtml(q, number) {
  const stem = q.stem.map(blockHtml).join('');
  let opts = '';
  if (q.opts) opts = `<ol class="opts">${q.opts.map((o) => `<li><span class="k">${o.k})</span><div>${o.b.map(blockHtml).join('')}</div></li>`).join('')}</ol>`;
  if (q.optTable)
    opts = `<table class="optt"><tr><th></th>${q.optTable.head.map((h) => `<th>${inlineHtml(h)}</th>`).join('')}</tr>${q.optTable.rows
      .map((r) => `<tr><td class="k">${r.k})</td>${r.c.map((c) => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`)
      .join('')}</table>`;
  return `<article><h1>Q${number}.</h1>${stem}${opts}</article>`;
}

export const CSS = `
body{margin:0;background:#fff;color:#222;font:16px/1.5 "Nunito",system-ui,sans-serif}
article{width:780px;padding:16px 20px}
h1{font-size:16px;margin:0 0 6px}
p{margin:6px 0} p.note{font-size:13px;color:#555}
code,pre{font-family:ui-monospace,Consolas,"DejaVu Sans Mono",monospace}
code{background:#f3efe6;border-radius:4px;padding:0 3px}
pre{background:#f7f4ec;border:1px solid #e6dfcf;border-radius:8px;padding:8px 10px;white-space:pre;overflow-x:auto;font-size:14px;line-height:1.45}
table{border-collapse:collapse;margin:8px 0} th,td{border:1px solid #bbb;padding:3px 8px;text-align:left;vertical-align:top}
th{background:#f3f3f3}
.blank{display:inline-block;min-width:2.2em;padding:0 6px;border:2px solid #222;text-align:center;font-weight:700;font-family:sans-serif;line-height:1.2}
.ov{text-decoration:overline}
figure{margin:8px 0} figure svg{max-width:640px;width:100%;height:auto}
ol.opts{list-style:none;padding:0;margin:10px 0} ol.opts li{display:flex;gap:8px;margin:4px 0} .k{font-weight:700;white-space:nowrap}
ol.opts li div p:first-child{margin-top:0}
table.optt td.k{border:none;background:none}
`;
