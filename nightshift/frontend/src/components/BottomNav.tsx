import type { ReactNode } from 'react';
import type { Tab } from '../lib/types';
import { DoorIcon, RadarIcon, SquadIcon } from './Icons';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const items: { tab: Tab; label: string; icon: ReactNode }[] = [
  { tab: 'radar', label: 'Radar', icon: <RadarIcon className="nav-icon" /> },
  { tab: 'connector', label: 'Connector', icon: <SquadIcon className="nav-icon" /> },
  { tab: 'host', label: 'Host', icon: <DoorIcon className="nav-icon" /> },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Sections">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          className={`nav-item${active === item.tab ? ' nav-item-active' : ''}`}
          aria-current={active === item.tab ? 'page' : undefined}
          onClick={() => onChange(item.tab)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
