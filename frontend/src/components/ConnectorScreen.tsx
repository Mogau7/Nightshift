import { useEffect, useState } from 'react';
import type { Beacon, Notify, Squad } from '../lib/types';
import CallsignField from './CallsignField';
import SquadTracker from './SquadTracker';

interface ConnectorScreenProps {
  beacons: Beacon[];
  squads: Squad[];
  mySquads: string[];
  callsign: string;
  onCallsign: (value: string) => void;
  preselectedId: number | null;
  notify: Notify;
  onLaunch: (beaconId: number, targetSize: number) => Promise<Squad | null>;
  onJoin: (code: string) => Promise<boolean>;
  onViewBeacon: (beaconId: number) => void;
}

const MIN_SIZE = 2;
const MAX_SIZE = 8;

export default function ConnectorScreen({
  beacons,
  squads,
  mySquads,
  callsign,
  onCallsign,
  preselectedId,
  notify,
  onLaunch,
  onJoin,
  onViewBeacon,
}: ConnectorScreenProps) {
  const [pickedId, setPickedId] = useState<number | null>(preselectedId);
  const [targetSize, setTargetSize] = useState(3);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (preselectedId !== null) {
      setPickedId(preselectedId);
    }
  }, [preselectedId]);

  const activeId =
    pickedId !== null && beacons.some((beacon) => beacon.id === pickedId)
      ? pickedId
      : beacons.length > 0
        ? beacons[0].id
        : null;

  const mine = squads
    .filter((squad) => mySquads.includes(squad.code))
    .sort((a, b) => b.created_at_ms - a.created_at_ms);

  async function launch() {
    if (activeId === null) {
      return;
    }
    setLaunching(true);
    try {
      await onLaunch(activeId, targetSize);
    } finally {
      setLaunching(false);
    }
  }

  return (
    <section>
      <div className="screen-head">
        <p className="eyebrow">Connector</p>
        <h1 className="screen-title">Raise a Squad Bounty</h1>
        <p className="screen-sub">
          Pick a beacon, set the headcount and send the burner link. The door opens the moment the
          squad is full.
        </p>
      </div>

      <div className="panel">
        <CallsignField value={callsign} onChange={onCallsign} />
      </div>

      <p className="section-label">1. Choose a beacon</p>
      {beacons.length === 0 ? (
        <p className="empty-note">No beacons to build a squad around yet.</p>
      ) : (
        <div className="pick-list">
          {beacons.map((beacon) => (
            <button
              key={beacon.id}
              type="button"
              className={`pick${beacon.id === activeId ? ' pick-active' : ''}`}
              aria-pressed={beacon.id === activeId}
              onClick={() => setPickedId(beacon.id)}
            >
              <span className="pick-zone">{beacon.zone_hint}</span>
              <span className="pick-meta">
                {beacon.vibe} · {beacon.bounty}
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="section-label">2. Squad size</p>
      <div className="stepper">
        <button
          type="button"
          className="stepper-btn"
          aria-label="Fewer people"
          disabled={targetSize <= MIN_SIZE}
          onClick={() => setTargetSize((size) => Math.max(MIN_SIZE, size - 1))}
        >
          −
        </button>
        <div className="stepper-value">
          <span className="stepper-number">{targetSize}</span>
          <span className="stepper-label">people to unlock</span>
        </div>
        <button
          type="button"
          className="stepper-btn"
          aria-label="More people"
          disabled={targetSize >= MAX_SIZE}
          onClick={() => setTargetSize((size) => Math.min(MAX_SIZE, size + 1))}
        >
          +
        </button>
      </div>

      <div className="panel panel-tight">
        <button
          type="button"
          className="btn-scan"
          disabled={activeId === null || launching}
          onClick={launch}
        >
          <span>{launching ? 'Launching…' : 'Launch Squad Bounty'}</span>
        </button>
      </div>

      <p className="section-label">Your squads</p>
      {mine.length === 0 ? (
        <p className="empty-note">Squads you start or join will show up here.</p>
      ) : (
        <div className="stack">
          {mine.map((squad) => {
            const beacon = beacons.find((item) => item.id === squad.beacon_id);
            return (
              <div key={squad.code} className="my-squad">
                <p className="my-squad-zone">{beacon ? beacon.zone_hint : 'Beacon closed'}</p>
                <SquadTracker squad={squad} callsign={callsign} notify={notify} onJoin={onJoin} />
                {squad.unlocked && beacon && (
                  <button
                    type="button"
                    className="btn-notch btn-notch-small"
                    onClick={() => onViewBeacon(beacon.id)}
                  >
                    Open the venue card
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
