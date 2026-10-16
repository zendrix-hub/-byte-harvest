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
