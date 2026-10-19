import type { ComponentChildren } from 'preact';
import type { Block, QuestionText } from '../../data/qtext';
import './question.css';

function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Renders the inline markup: `code`, **bold**, ^{sup}, _{sub}, ~{overline}, [[A]] blank, \n. Never uses innerHTML. */
export function parseInline(s: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push(text);
    text = '';
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '`') {
      const j = s.indexOf('`', i + 1);
      if (j > i) {
        flush();
        out.push(<code>{s.slice(i + 1, j)}</code>);
        i = j + 1;
        continue;
      }
    }
    if (s.startsWith('**', i)) {
      const j = s.indexOf('**', i + 2);
      if (j > i) {
        flush();
        out.push(<b>{parseInline(s.slice(i + 2, j))}</b>);
        i = j + 2;
        continue;
      }
    }
    if ((c === '^' || c === '_' || c === '~') && s[i + 1] === '{') {
      const j = matchBrace(s, i + 1);
      if (j > i) {
        flush();
        const inner = parseInline(s.slice(i + 2, j));
        out.push(c === '^' ? <sup>{inner}</sup> : c === '_' ? <sub>{inner}</sub> : <span class="q-ov">{inner}</span>);
        i = j + 1;
        continue;
      }
    }
    if (s.startsWith('[[', i)) {
      const j = s.indexOf(']]', i + 2);
      if (j > i) {
        flush();
        out.push(<span class="q-blank">{s.slice(i + 2, j)}</span>);
        i = j + 2;
        continue;
      }
    }
    if (c === '\n') {
      flush();
      out.push(<br />);
      i++;
      continue;
    }
    text += c;
    i++;
  }
  flush();
  return out;
}

function codeWithBlanks(src: string): ComponentChildren[] {
  return src.split(/\[\[([^\]]{1,6})\]\]/).map((part, i) => (i % 2 ? <span class="q-blank">{part}</span> : part));
}

/** Figures are drawn by us as SVG; still strip anything executable before injecting. */
export function safeSvg(svg: string): string | null {
  const s = svg.trim();
  if (!s.startsWith('<svg') || /<script|<foreignObject|<iframe|<image|javascript:/i.test(s)) return null;
  return s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '');
}

export function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'p':
      return <p>{parseInline(b.x)}</p>;
    case 'note':
      return <p class="q-note">{parseInline(b.x)}</p>;
    case 'code':
      return (
        <div class="q-scroll">
          <pre class="q-code">{codeWithBlanks(b.x)}</pre>
        </div>
      );
    case 'list':
      return (
        <ul class="q-list">
          {b.items.map((x, i) => (
            <li key={i}>{parseInline(x)}</li>
          ))}
        </ul>
      );
    case 'table': {
      const head = b.head ?? 1;
      return (
        <div class="q-scroll">
          <table class="q-table">
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => (i < head ? <th key={j}>{parseInline(c)}</th> : <td key={j}>{parseInline(c)}</td>))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'svg': {
      const svg = safeSvg(b.svg);
      return svg ? (
        <figure class="q-fig" role="img" aria-label={b.alt} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p class="q-note">[Figure: {b.alt}]</p>
      );
    }
    default:
      return null;
  }
}

interface Props {
  q: QuestionText;
  pick: string | null;
  answer: string | null; // the key, only once committed
  onPick: (letter: string) => void;
}

export function QuestionBody({ q, pick, answer, onPick }: Props) {
  const rowClass = (k: string) =>
    `${pick === k ? ' sel' : ''}${answer && k === answer ? ' right' : ''}${answer && k === pick && k !== answer ? ' wrong' : ''}`;
  const choose = (k: string) => {
    if (!answer) onPick(k);
  };
  return (
    <div class="q-body">
      {q.stem.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}
      {q.opts && (
        <ol class="q-opts">
          {q.opts.map((o) => (
            <li key={o.k} class={`q-opt${rowClass(o.k)}`} onClick={() => choose(o.k)}>
              <span class="q-k">{o.k})</span>
              <div class="q-opt-body">
                {o.b.map((b, i) => (
                  <BlockView key={i} b={b} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
      {q.optTable && (
        <div class="q-scroll">
          <table class="q-table q-optt">
            <tbody>
              <tr>
                <th />
                {q.optTable.head.map((h, i) => (
                  <th key={i}>{parseInline(h)}</th>
                ))}
              </tr>
              {q.optTable.rows.map((r) => (
                <tr key={r.k} class={`q-opt${rowClass(r.k)}`} onClick={() => choose(r.k)}>
                  <td class="q-k">{r.k})</td>
                  {r.c.map((c, i) => (
                    <td key={i}>{parseInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
