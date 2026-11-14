import type { CSSProperties } from 'react';
import type { Beacon } from '../lib/types';

interface RadarDiscProps {
  beacons: Beacon[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function blipPosition(beacon: Beacon): CSSProperties {
  const radians = (beacon.angle_deg * Math.PI) / 180;
  const reach = (beacon.distance / 100) * 46;
  return {
    left: `${50 + Math.cos(radians) * reach}%`,
    top: `${50 + Math.sin(radians) * reach}%`,
  };
}

export default function RadarDisc({ beacons, selectedId, onSelect }: RadarDiscProps) {
  return (
    <div className="radar-wrap">
      <div className="radar" role="group" aria-label="Live street radar">
        <div className="radar-grid" />
        <div className="radar-sweep" />
        <div className="radar-core" />
        {beacons.map((beacon) => (
          <button
            key={beacon.id}
            type="button"
            className={`blip-hit${beacon.id === selectedId ? ' blip-selected' : ''}`}
            style={blipPosition(beacon)}
            onClick={() => onSelect(beacon.id)}
            aria-label={`Beacon near ${beacon.zone_hint}`}
          >
            <span className={`blip${beacon.unlocked ? ' blip-open' : ''}`} />
          </button>
        ))}
      </div>
      <p className="radar-caption">
        {beacons.length === 0
          ? 'The street is quiet. Light a beacon from the Host tab.'
          : 'Tap a blip to pull up its card'}
      </p>
    </div>
  );
}
