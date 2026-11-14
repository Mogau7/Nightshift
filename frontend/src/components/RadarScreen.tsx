import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Beacon, Notify, Squad } from '../lib/types';
import BeaconCard from './BeaconCard';
import CallsignField from './CallsignField';
import RadarDisc from './RadarDisc';

interface RadarScreenProps {
  beacons: Beacon[];
  squads: Squad[];
  clock: number;
  callsign: string;
  onCallsign: (value: string) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  inviteCode: string;
  notify: Notify;
  onJoin: (code: string) => Promise<boolean>;
  onStartSquad: (beaconId: number) => void;
}

export default function RadarScreen({
  beacons,
  squads,
  clock,
  callsign,
  onCallsign,
  selectedId,
  onSelect,
  inviteCode,
  notify,
  onJoin,
  onStartSquad,
}: RadarScreenProps) {
  const [code, setCode] = useState(inviteCode);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    setCode(inviteCode);
  }, [inviteCode]);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }
    document
      .getElementById(`beacon-${selectedId}`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedId]);

  const formingCount = squads.filter((squad) => !squad.unlocked).length;

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim().length < 4) {
      notify('Type the 6 character burner code first.', 'error');
      return;
    }
    setJoining(true);
    try {
      const joined = await onJoin(code);
      if (joined) {
        setCode('');
      }
    } finally {
      setJoining(false);
    }
  }

  return (
    <section>
      <div className="screen-head">
        <p className="eyebrow">Street radar</p>
        <h1 className="screen-title">Doors that open after dark</h1>
        <p className="screen-sub">
          {beacons.length} {beacons.length === 1 ? 'beacon' : 'beacons'} live, {formingCount}{' '}
          {formingCount === 1 ? 'squad' : 'squads'} forming
        </p>
      </div>

      <RadarDisc beacons={beacons} selectedId={selectedId} onSelect={onSelect} />

      <div className="panel">
        <CallsignField value={callsign} onChange={onCallsign} />
        <form className="join-form" onSubmit={submitCode}>
          <label className="field">
            <span className="field-label">Got a burner code?</span>
            <input
              className="field-input field-code"
              value={code}
              maxLength={12}
              placeholder="K7M2QX"
              autoComplete="off"
              autoCapitalize="characters"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <button type="submit" className="btn-notch" disabled={joining}>
            {joining ? 'Joining…' : 'Join'}
          </button>
        </form>
      </div>

      <p className="section-label">Live beacons</p>
      {beacons.length === 0 ? (
        <p className="empty-note">Nothing is lit right now.</p>
      ) : (
        <div className="card-rail">
          {beacons.map((beacon) => (
            <BeaconCard
              key={beacon.id}
              beacon={beacon}
              squads={squads.filter((squad) => squad.beacon_id === beacon.id)}
              clock={clock}
              callsign={callsign}
              selected={beacon.id === selectedId}
              notify={notify}
              onSelect={onSelect}
              onJoin={onJoin}
              onStartSquad={onStartSquad}
            />
          ))}
        </div>
      )}
    </section>
  );
}
