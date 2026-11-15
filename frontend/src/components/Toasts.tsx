import type { ToastItem } from '../lib/types';

interface ToastsProps {
  items: ToastItem[];
}

export default function Toasts({ items }: ToastsProps) {
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.kind}`}>
          <span className="toast-dot" aria-hidden="true" />
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
