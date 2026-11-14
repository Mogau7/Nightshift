interface TopBarProps {
  busy: boolean;
  offline: boolean;
  onDemoUnlock: () => void;
}

export default function TopBar({ busy, offline, onDemoUnlock }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="flex items-center gap-2">
        <span className={`logo-dot${offline ? ' logo-dot-off' : ''}`} aria-hidden="true" />
        <span className="brand-word">NIGHTSHIFT</span>
      </div>
      <button type="button" className="demo-pill" onClick={onDemoUnlock} disabled={busy}>
        <span className="demo-pill-dot" aria-hidden="true" />
        Demo Unlock
      </button>
    </header>
  );
}
