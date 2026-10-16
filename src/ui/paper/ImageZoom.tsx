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
