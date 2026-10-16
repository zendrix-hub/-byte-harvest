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
